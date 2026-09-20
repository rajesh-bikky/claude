import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, isValidToken } from "@/lib/auth";

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|manifest.json|icons).*)"],
};

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (await isValidToken(token)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
