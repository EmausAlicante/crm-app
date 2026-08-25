import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

// Next.js 16 renamed Middleware to Proxy — same mechanism, runs on the
// Node.js runtime in this version, so a direct DB session check (not just a
// signed-cookie "optimistic" check) is safe to do here on every request.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The daily-digest cron guards itself with CRON_SECRET and has no session
  // to check (Vercel Cron doesn't carry cookies).
  if (pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  // Root layout can't see the URL directly (it's a Server Component, not a
  // page), so it hides the app nav on /login by reading this header instead.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  const passthrough = () => NextResponse.next({ request: { headers: requestHeaders } });

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = token ? await isValidSession(token) : false;

  if (pathname === "/login") {
    // Already logged in — no reason to see the login screen again.
    return authenticated ? NextResponse.redirect(new URL("/dashboard", req.url)) : passthrough();
  }

  if (!authenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return passthrough();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
