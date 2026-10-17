import { json, preflight } from "@/lib/cors";
import { getStore, save } from "@/lib/store";
import { pickIdeaFor, whyYou } from "@/lib/targeting";
import type { HostUser } from "@/lib/types";

export const OPTIONS = preflight;

/**
 * The host identifies its user (persona, tenure, feature usage) and BITNIT
 * decides whether there's an idea worth asking them about.
 */
export async function POST(req: Request) {
  const { user } = (await req.json()) as { user?: HostUser };
  if (!user?.id || !user.persona) return json({ error: "user.id and user.persona are required" }, 400);

  const store = getStore();
  store.users[user.id] = {
    ...user,
    name: user.name ?? user.id,
    plan: user.plan ?? "",
    tenureDays: Number(user.tenureDays) || 0,
    featureUsage: user.featureUsage ?? {},
  };

  const pick = pickIdeaFor(store.users[user.id], store);
  if (!pick) {
    save();
    return json({ prompt: null });
  }
  store.impressions.push({ ideaId: pick.idea.id, userId: user.id, at: new Date().toISOString() });
  save();

  return json({
    prompt: {
      ideaId: pick.idea.id,
      title: pick.idea.title,
      problem: pick.idea.problem,
      solution: pick.idea.solution,
      whyYou: whyYou(pick.fit),
      fit: pick.fit.fit,
    },
  });
}
