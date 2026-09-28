import { NextResponse } from "next/server";
import { auth } from "@/auth";

// /api/spinoffs* is excluded here — the local watcher script authenticates
// with its own bearer-token secret instead of a Google session (see
// app/api/spinoffs/route.ts and app/api/spinoffs/[id]/route.ts).
export const config = {
  matcher: [
    "/((?!login|api/auth|api/spinoffs|_next/static|_next/image|favicon.ico|manifest.json|icons).*)",
  ],
};

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});
