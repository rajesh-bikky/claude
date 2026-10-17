import { resetStore } from "@/lib/store";

export async function POST() {
  resetStore();
  return Response.json({ ok: true });
}
