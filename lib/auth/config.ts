/** True when AUTH_ENABLED is the string "true" (case-insensitive, trimmed). */
export function isAuthEnabled(): boolean {
  return (process.env.AUTH_ENABLED ?? "").trim().toLowerCase() === "true";
}
