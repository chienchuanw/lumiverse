import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getDb } from "./db";
import { verifyCredentials } from "./lib/auth/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const email = typeof creds?.email === "string" ? creds.email : "";
        const password = typeof creds?.password === "string" ? creds.password : "";
        if (!email || !password) return null;
        const user = await verifyCredentials(getDb(), { email, password });
        if (!user) return null;
        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user && "role" in user) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        if (token.role) session.user.role = token.role as "admin" | "member";
      }
      return session;
    },
  },
});
