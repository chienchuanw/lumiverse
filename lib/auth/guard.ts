import { isAuthEnabled } from "./config";

export interface SessionUser {
  id: string;
  email: string;
  role: "admin" | "member";
}

export interface SessionLike {
  user?: SessionUser | { email?: string | null } | null;
}

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Throws UnauthorizedError if a write action is not permitted: when auth is
 * enabled there must be a session with a user. When auth is disabled, always allowed.
 */
export function assertCanWrite(session: SessionLike | null | undefined): void {
  if (!isAuthEnabled()) return;
  if (!session?.user) throw new UnauthorizedError();
}
