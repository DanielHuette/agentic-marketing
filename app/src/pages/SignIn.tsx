// Sign-in of the one operator account; sign-ups are switched off in Supabase.
import { useState } from "preact/hooks";
import { signIn } from "../api/queries";
import { ErrorNote } from "../components/ui";
import { useAction } from "../hooks/useAsync";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const action = useAction();
  const submit = (event: Event) => {
    event.preventDefault();
    void action.run(() => signIn(email.trim(), password));
  };
  return (
    <main class="signin">
      <form class="signin__card panel stack" onSubmit={submit}>
        <div class="cluster">
          <img src="/favicon.svg" alt="" width={40} height={40} />
          <div>
            <p class="kicker">Agentic Marketing</p>
            <h1>Cockpit</h1>
          </div>
        </div>
        <p class="muted">Recherche prüfen, Beiträge freigeben, Kampagnen starten und Ergebnisse sehen.</p>
        <label>
          E-Mail
          <input type="email" autocomplete="username" required value={email} onInput={(event) => { setEmail(event.currentTarget.value); }} />
        </label>
        <label>
          Passwort
          <input type="password" autocomplete="current-password" required value={password} onInput={(event) => { setPassword(event.currentTarget.value); }} />
        </label>
        <ErrorNote message={action.error} />
        <button class="button button--primary button--big" type="submit" disabled={action.busy}>
          {action.busy ? "Melde an …" : "Anmelden"}
        </button>
      </form>
    </main>
  );
}
