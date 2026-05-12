import { getDb } from "@/db";
import { registerUser, WeakPasswordError } from "@/lib/auth/users";

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === "23505";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const email = (body as { email?: unknown })?.email;
  const password = (body as { password?: unknown })?.password;
  if (typeof email !== "string" || typeof password !== "string" || !email.trim()) {
    return Response.json({ error: "email and password are required." }, { status: 400 });
  }

  try {
    const user = await registerUser(getDb(), { email, password });
    return Response.json(
      { id: user.id, email: user.email, role: user.role },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof WeakPasswordError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    if (isUniqueViolation(err)) {
      return Response.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    throw err;
  }
}
