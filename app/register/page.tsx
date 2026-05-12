import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getDb } from "@/db";
import { MIN_PASSWORD_LENGTH, registerUser, WeakPasswordError } from "@/lib/auth/users";

export default async function RegisterPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await props.searchParams;

  async function register(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    try {
      await registerUser(getDb(), { email, password });
    } catch (err) {
      if (err instanceof WeakPasswordError) redirect("/register?error=weak-password");
      if ((err as { code?: string })?.code === "23505") redirect("/register?error=email-taken");
      throw err;
    }
    await signIn("credentials", { email, password, redirectTo: "/" });
  }

  return (
    <main>
      <h1>Create an account</h1>
      {error && <p role="alert">{error === "email-taken" ? "That email is already registered." : `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`}</p>}
      <form action={register}>
        <label>
          Email
          <input type="email" name="email" required />
        </label>
        <label>
          Password
          <input type="password" name="password" required minLength={MIN_PASSWORD_LENGTH} />
        </label>
        <button type="submit">Register</button>
      </form>
      <p>
        Already have an account? <a href="/login">Log in</a>
      </p>
    </main>
  );
}
