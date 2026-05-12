import { isAuthEnabled } from "./config";
import type { SessionLike } from "./guard";

/**
 * Returns the current session, or null. When auth is disabled this never
 * touches NextAuth (so route handlers stay importable without an AUTH_SECRET).
 */
export async function getSessionOrNull(): Promise<SessionLike | null> {
  if (!isAuthEnabled()) return null;
  const { auth } = await import("../../auth");
  return (await auth()) as SessionLike | null;
}
