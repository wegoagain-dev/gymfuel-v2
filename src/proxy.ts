import { NextResponse, type NextRequest } from "next/server"

const APP_ROUTES = ["/today", "/meals", "/groceries", "/recipes", "/coach", "/profile"]
const AUTH_ROUTES = ["/login", "/register"]

/**
 * Optimistic redirects only — it just checks whether a session cookie exists.
 * The real check (signature, expiry, user still exists) happens in lib/auth/dal.ts.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.has("gf_session")
  const isApp = APP_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))

  if (isApp && !hasSession) {
    const url = new URL("/login", request.url)
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }
  if ((AUTH_ROUTES.includes(pathname) || pathname === "/") && hasSession) {
    return NextResponse.redirect(new URL("/today", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|webp)$).*)"],
}
