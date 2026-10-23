import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE } from "@/lib/auth/session"

/** Drops a stale session cookie (route handlers may write cookies; pages may not). */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url))
  response.cookies.delete(SESSION_COOKIE)
  return response
}
