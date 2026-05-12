import { auth } from "@/auth";
import { isAuthEnabled } from "@/lib/auth/config";
import { assertCanWrite, UnauthorizedError } from "@/lib/auth/guard";

// Upload-a-fixture-version is implemented in issue #6. This stub establishes
// the write-access guard so unauthenticated requests are rejected with 401.
export async function POST() {
  const session = isAuthEnabled() ? await auth() : null;
  try {
    assertCanWrite(session);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return Response.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
  return Response.json(
    { error: "Fixture upload is not implemented yet — see issue #6." },
    { status: 501 },
  );
}
