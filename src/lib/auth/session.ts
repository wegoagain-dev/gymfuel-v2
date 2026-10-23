import "server-only"

import { cookies } from "next/headers"
import { jwtVerify, SignJWT } from "jose"

/**
 * Sessions are a signed JWT in an httpOnly cookie, so page JavaScript can never read the
 * token (the old app kept it in localStorage). The cookie only carries the user id; the
 * user row is always loaded fresh from the database.
 */
export const SESSION_COOKIE = "gf_session"
const SESSION_DAYS = 7

function secretKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set to at least 32 characters in production")
    }
    return new TextEncoder().encode("dev-only-session-secret-change-me-0123456789")
  }
  return new TextEncoder().encode(secret)
}

export async function createSession(userId: number) {
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(secretKey())
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  })
}

export async function readSession(): Promise<{ userId: number } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] })
    return typeof payload.uid === "number" ? { userId: payload.uid } : null
  } catch {
    return null
  }
}

export async function deleteSession() {
  ;(await cookies()).delete(SESSION_COOKIE)
}
