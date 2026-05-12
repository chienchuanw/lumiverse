import { count, eq } from "drizzle-orm";
import type { Db } from "../../db";
import { users, type User } from "../../db/schema";
import { hashPassword, verifyPassword } from "./password";

export const MIN_PASSWORD_LENGTH = 8;

export class WeakPasswordError extends Error {
  constructor() {
    super(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    this.name = "WeakPasswordError";
  }
}

export interface Credentials {
  email: string;
  password: string;
}

/**
 * Creates a user. The first user ever registered becomes `admin`; everyone
 * after that is a `member`. Rejects weak passwords and duplicate emails.
 */
export async function registerUser(db: Db, { email, password }: Credentials): Promise<User> {
  if (password.length < MIN_PASSWORD_LENGTH) throw new WeakPasswordError();

  const [{ value: existing }] = await db.select({ value: count() }).from(users);
  const role = existing === 0 ? "admin" : "member";
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({ email: email.trim().toLowerCase(), passwordHash, role })
    .returning();
  return user;
}

/** Returns the user if the email exists and the password matches, else null. */
export async function verifyCredentials(
  db: Db,
  { email, password }: Credentials,
): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  if (!user) return null;
  return (await verifyPassword(password, user.passwordHash)) ? user : null;
}
