import { NextRequest, NextResponse } from "next/server";

// Kept as a literal (not imported from lib/auth) on purpose: this file runs on the Edge
// runtime, which can't load the native better-sqlite3 binding that lib/auth.ts pulls in
// transitively via lib/db.ts. Edge middleware only checks "is there a session cookie"
// (cheap, no DB access at the edge) — must match SESSION_COOKIE in lib/auth.ts.
const SESSION_COOKIE = "mdm_session";
// Role/permission enforcement and expiry/validity checks happen server-side per request
// (API routes via getCurrentUser, pages via the layout's user fetch) — this just keeps a
// logged-out visitor from ever seeing an authenticated page shell.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico";

  if (isPublic) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
