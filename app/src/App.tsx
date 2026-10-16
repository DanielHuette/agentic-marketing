// Routes of the signed-in app; without a session only the sign-in page is shown.
import { LocationProvider, Route, Router } from "preact-iso";
import { Shell } from "./components/Shell";
import { Loading } from "./components/ui";
import { useSession } from "./hooks/useSession";
import { CampaignPage } from "./pages/Campaign";
import { Campaigns } from "./pages/Campaigns";
import { Guide } from "./pages/Guide";
import { PostPage } from "./pages/Post";
import { Settings } from "./pages/Settings";
import { SignIn } from "./pages/SignIn";

function NotFound() {
  return <p class="muted">Diese Seite gibt es nicht. <a href="/">Zu den Kampagnen</a></p>;
}

export function App() {
  const session = useSession();
  if (session === undefined) {
    return (
      <main class="page">
        <Loading />
      </main>
    );
  }
  if (session === null) return <SignIn />;
  const email = session.user.email ?? "";
  return (
    <LocationProvider>
      <Shell>
        <Router>
          <Route path="/" component={Campaigns} />
          <Route path="/kampagne/:id" component={({ id }: { id: string }) => <CampaignPage id={id} />} />
          <Route path="/beitrag/:id" component={({ id }: { id: string }) => <PostPage id={id} />} />
          <Route path="/anleitung" component={Guide} />
          <Route path="/einstellungen" component={() => <Settings email={email} />} />
          <Route default component={NotFound} />
        </Router>
      </Shell>
    </LocationProvider>
  );
}
