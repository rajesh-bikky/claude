import type { NextRequest } from "next/server";

// The spin-off watcher script runs unattended on the user's machine and
// can't complete an interactive Google OAuth flow, so it authenticates with
// this separate shared secret instead of a session.
export function isValidWatcherRequest(request: NextRequest): boolean {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const secret = process.env.WATCHER_SECRET;
  return Boolean(secret) && token === secret;
}
