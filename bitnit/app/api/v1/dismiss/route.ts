import { json, preflight } from "@/lib/cors";
import { getStore, save } from "@/lib/store";

export const OPTIONS = preflight;

export async function POST(req: Request) {
  const { ideaId, userId } = (await req.json()) as { ideaId?: string; userId?: string };
  const store = getStore();
  const imp = store.impressions.findLast((i) => i.ideaId === ideaId && i.userId === userId);
  if (!imp) return json({ error: "no impression for that idea and user" }, 404);
  imp.dismissed = true;
  save();
  return json({ ok: true });
}
