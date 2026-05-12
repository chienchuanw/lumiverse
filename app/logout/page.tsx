import { signOut } from "@/auth";

export default function LogoutPage() {
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <main>
      <h1>Log out</h1>
      <form action={logout}>
        <button type="submit">Log out</button>
      </form>
    </main>
  );
}
