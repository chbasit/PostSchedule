import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./src/i18n/routing";

const intl = createMiddleware(routing);

const SESSION_COOKIE = "ps_session";
const PROTECTED = /^\/([^/]+)\/(dashboard|onboarding)(?:\/|$)/;

// Sends signed-out visitors to sign-in. This is a convenience redirect only:
// the API checks the session on every request (BACKEND.md §6.3).
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const match = pathname.match(PROTECTED);

  if (
    match &&
    (routing.locales as readonly string[]).includes(match[1]) &&
    !request.cookies.has(SESSION_COOKIE)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/${match[1]}/login`;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return intl(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
