// Every read and write of the app. Row level security lets everyone signed in read and only the
// administrator write; the approval guard and the scheduling live in database triggers, not here.
import { supabase } from "./supabase";
import { QueryError } from "../lib/errors";
import type {
  Campaign,
  CampaignEvent,
  CampaignOverview,
  Finding,
  Metric,
  Post,
  PostWithFindings,
  Report,
} from "./types";

const db = () => supabase.schema("marketing");

interface Result<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

function unwrap<T>(action: string, result: Result<T>): T {
  if (result.error !== null) throw new QueryError(action, result.error.message, result.error.code ?? null);
  if (result.data === null) throw new QueryError(action, "keine Daten", null);
  return result.data;
}

async function actor(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? "operator";
}

async function logEvent(campaignId: string, kind: string, postId: string | null, note: string | null): Promise<void> {
  const result = await db()
    .from("events")
    .insert({ campaign_id: campaignId, post_id: postId, kind, actor: await actor(), note });
  if (result.error !== null) throw new QueryError("Verlauf schreiben", result.error.message, result.error.code);
}

export async function listCampaigns(): Promise<CampaignOverview[]> {
  const result = await db().from("campaign_overview").select("*").order("is_example").order("title");
  return unwrap("Kampagnen laden", result as Result<CampaignOverview[]>);
}

export async function getCampaign(id: string): Promise<Campaign> {
  const result = await db().from("campaigns").select("*").eq("id", id).single();
  return unwrap("Kampagne laden", result as Result<Campaign>);
}

export async function listPosts(campaignId: string): Promise<Post[]> {
  const result = await db().from("posts").select("*").eq("campaign_id", campaignId).order("day_offset").order("channel");
  return unwrap("Beiträge laden", result as Result<Post[]>);
}

export async function getPost(id: string): Promise<PostWithFindings> {
  const result = await db().from("posts").select("*, post_findings(findings(*))").eq("id", id).single();
  return unwrap("Beitrag laden", result as Result<PostWithFindings>);
}

export async function listFindings(campaignId: string): Promise<Finding[]> {
  const result = await db().from("findings").select("*").eq("campaign_id", campaignId).order("key");
  return unwrap("Befunde laden", result as Result<Finding[]>);
}

export async function listEvents(campaignId: string): Promise<CampaignEvent[]> {
  const result = await db()
    .from("events")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(200);
  return unwrap("Verlauf laden", result as Result<CampaignEvent[]>);
}

export async function listMetrics(postIds: readonly string[]): Promise<Metric[]> {
  if (postIds.length === 0) return [];
  const result = await db().from("metrics").select("*").in("post_id", [...postIds]).order("day");
  return unwrap("Ergebnisse laden", result as Result<Metric[]>);
}

export async function listReports(campaignId: string): Promise<Report[]> {
  const result = await db()
    .from("reports")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("period_end", { ascending: false });
  return unwrap("Berichte laden", result as Result<Report[]>);
}

async function setPost(post: Post, values: Partial<Post>, action: string): Promise<Post> {
  const result = await db().from("posts").update(values).eq("id", post.id).select("*").single();
  return unwrap(action, result as Result<Post>);
}

export async function approvePost(post: Post): Promise<Post> {
  const saved = await setPost(post, { status: "approved", review_note: null }, "Freigeben");
  await logEvent(post.campaign_id, "approved", post.id, post.title);
  return saved;
}

export async function rejectPost(post: Post, note: string): Promise<Post> {
  const saved = await setPost(post, { status: "rejected", review_note: note }, "Ablehnen");
  await logEvent(post.campaign_id, "rejected", post.id, note);
  return saved;
}

export async function reopenPost(post: Post): Promise<Post> {
  const saved = await setPost(post, { status: "review" }, "Zurück in die Prüfung");
  await logEvent(post.campaign_id, "reopened", post.id, post.title);
  return saved;
}

export async function editPost(
  post: Post,
  values: { title: string; summary: string; body_md: string; unbacked_figures: string[] },
): Promise<Post> {
  const saved = await setPost(post, { ...values, status: "review" }, "Speichern");
  await logEvent(post.campaign_id, "edited", post.id, `Fassung ${String(saved.version)}`);
  return saved;
}

export async function markPosted(post: Post, url: string): Promise<Post> {
  const saved = await setPost(
    post,
    { status: "published", published_at: new Date().toISOString(), url },
    "Als gepostet markieren",
  );
  await logEvent(post.campaign_id, "posted", post.id, url);
  return saved;
}

export async function startCampaign(campaign: Campaign): Promise<void> {
  const result = await db().rpc("start_campaign", { p_campaign: campaign.id });
  unwrap("Starten", result as Result<unknown>);
}

export async function pauseCampaign(campaign: Campaign): Promise<void> {
  const result = await db().rpc("pause_campaign", { p_campaign: campaign.id });
  unwrap("Pausieren", result as Result<unknown>);
}

export async function recordResult(
  post: Post,
  day: string,
  values: { views: number; clicks: number; leads: number },
): Promise<void> {
  const result = await db()
    .from("metrics")
    .upsert({ post_id: post.id, day, source: "manual", ...values }, { onConflict: "post_id,day,source" });
  if (result.error !== null) throw new QueryError("Ergebnis eintragen", result.error.message, result.error.code);
  await logEvent(post.campaign_id, "result", post.id, `${day}: ${String(values.views)}/${String(values.clicks)}/${String(values.leads)}`);
}

export async function isAdmin(): Promise<boolean> {
  return unwrap("Rolle prüfen", await supabase.rpc("is_admin")) === true;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error !== null) throw new QueryError("Anmelden", error.message, error.code ?? null);
}

export async function requestPasswordReset(email: string, redirectTo: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error !== null) throw new QueryError("Link senden", error.message, error.code ?? null);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
