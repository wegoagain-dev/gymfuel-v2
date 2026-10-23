"use server"

import { randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"
import { eq, or } from "drizzle-orm"
import { redirect } from "next/navigation"
import { getDb } from "@/db"
import { users } from "@/db/schema"
import { createSession, deleteSession } from "@/lib/auth/session"
import { fieldErrors, firstError, loginSchema, registerSchema } from "@/lib/validation"
import { fail, type ActionResult } from "./result"

export type AuthFormState = (ActionResult & { values?: Record<string, string> }) | null

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : ""
  return next.startsWith("/") && !next.startsWith("//") ? next : "/today"
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  const values = { email: String(formData.get("email") ?? "") }
  if (!parsed.success) return { ...fail(firstError(parsed.error), fieldErrors(parsed.error)), values }

  const db = await getDb()
  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1)
  // Same message for unknown email and wrong password, so accounts can't be probed.
  const valid = user && (await bcrypt.compare(parsed.data.password, user.passwordHash))
  if (!user || !valid) return { ...fail("Incorrect email or password"), values }

  await createSession(user.id)
  redirect(safeNext(formData.get("next")))
}

export async function register(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = Object.fromEntries(formData)
  const values = {
    fullName: String(raw.fullName ?? ""),
    username: String(raw.username ?? ""),
    email: String(raw.email ?? ""),
    role: String(raw.role ?? "client"),
  }
  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) return { ...fail(firstError(parsed.error), fieldErrors(parsed.error)), values }
  const data = parsed.data

  const db = await getDb()
  const [taken] = await db
    .select({ email: users.email, username: users.username })
    .from(users)
    .where(or(eq(users.email, data.email), eq(users.username, data.username)))
    .limit(1)
  if (taken?.email === data.email) {
    return { ...fail("An account with this email may already exist. Try signing in instead.", { email: "Already registered" }), values }
  }
  if (taken) return { ...fail("That username is taken", { username: "Choose another username" }), values }

  const [user] = await db
    .insert(users)
    .values({
      email: data.email,
      username: data.username,
      fullName: data.fullName,
      role: data.role,
      passwordHash: await bcrypt.hash(data.password, 12),
      // 16 hex chars (64 bits); the unique index catches the astronomically rare clash.
      clientCode: randomBytes(8).toString("hex").toUpperCase(),
    })
    .returning({ id: users.id })

  await createSession(user.id)
  redirect("/today?welcome=1")
}

export async function logout() {
  await deleteSession()
  redirect("/")
}
