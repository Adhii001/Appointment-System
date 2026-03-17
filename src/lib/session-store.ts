/**
 * Node.js-only in-memory active session store.
 * Shared between API route handlers and server components via globalThis.
 * A new login replaces the one active token, effectively invalidating any
 * previous session (single-login-at-a-time enforcement).
 */

const g = globalThis as unknown as { __activeSessionToken?: string };

export function setActiveToken(token: string): void {
  g.__activeSessionToken = token;
}

export function clearActiveToken(): void {
  g.__activeSessionToken = undefined;
}

export function isTokenActive(token: string): boolean {
  return (
    typeof g.__activeSessionToken === "string" &&
    g.__activeSessionToken === token
  );
}
