// Uses the Web Crypto API (not node:crypto) so this file works in both the
// Node.js and Edge middleware runtimes without a runtime flag.

export const AUTH_COOKIE = "thoughtline_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year, so the Home Screen icon stays logged in

async function expectedToken(): Promise<string> {
  const code = process.env.AUTH_CODE ?? "";
  const data = new TextEncoder().encode(`thoughtline:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function tokenForCode(code: string): Promise<string | null> {
  if (!/^\d{4}$/.test(code)) return null;
  if (code !== (process.env.AUTH_CODE ?? "")) return null;
  return expectedToken();
}

export async function isValidToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  return token === (await expectedToken());
}

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: COOKIE_MAX_AGE,
  path: "/",
};
