// Turns database and network failures into sentences the operator can act on.
export class QueryError extends Error {
  readonly code: string | null;
  readonly detail: string;

  constructor(action: string, message: string, code: string | null) {
    super(`${action}: ${message}`);
    this.name = "QueryError";
    this.code = code;
    this.detail = message;
  }
}

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const RAISED_EXCEPTION = "P0001";
const EXPIRED_TOKEN = "PGRST301";
const ROW_SECURITY = "42501";

function explainRaised(detail: string): string {
  if (detail.includes("figures without a checked source")) {
    return "Freigabe abgelehnt: Der Beitrag enthält Zahlen ohne geprüfte Quelle. Korrigiere den Text oder zitiere den passenden Befund.";
  }
  if (detail.includes("not ready to start")) return "Die Kampagne lässt sich in diesem Zustand nicht starten.";
  if (detail.includes("is not running")) return "Die Kampagne läuft nicht und lässt sich daher nicht pausieren.";
  return `Die Datenbank hat abgelehnt: ${detail}`;
}

export function describeError(error: unknown): string {
  if (error instanceof QueryError) {
    switch (error.code) {
      case UNIQUE_VIOLATION:
        return "Diesen Eintrag gibt es schon.";
      case FOREIGN_KEY_VIOLATION:
        return "Der Eintrag hängt an Daten, die es nicht mehr gibt. Lade die Seite neu.";
      case RAISED_EXCEPTION:
        return explainRaised(error.detail);
      case EXPIRED_TOKEN:
      case ROW_SECURITY:
        return "Deine Anmeldung ist abgelaufen. Melde dich neu an.";
      default:
        return `Das hat nicht geklappt. (${error.message})`;
    }
  }
  if (error instanceof TypeError) return "Keine Verbindung zum Server. Prüfe dein Netz und versuch es noch mal.";
  if (error instanceof Error) return `Das hat nicht geklappt. (${error.message})`;
  return "Das hat nicht geklappt.";
}
