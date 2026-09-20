"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, authCookieOptions, tokenForCode } from "@/lib/auth";

export async function login(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const next = String(formData.get("next") ?? "/browse");

  const token = await tokenForCode(code);
  if (!token) {
    redirect(`/login?next=${encodeURIComponent(next)}&error=1`);
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, authCookieOptions);
  redirect(next);
}
