import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth-constants";

/**
 * OPTIMISTIC gate only: redirects visitors with no session cookie away from /admin.
 * It does not verify the cookie. Real checks (`requireAdmin()` / `isAdmin()`) run inside
 * every admin page, server action and route handler.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();
  if (!request.cookies.has(ADMIN_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: "/admin/:path*" };
