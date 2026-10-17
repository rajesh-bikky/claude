import { metricByKey } from "@/lib/analytics";
import { getStore, newId, save } from "@/lib/store";

export async function POST(req: Request) {
  const b = (await req.json()) as { title?: string; metric?: string; target?: number };
  if (!b.title?.trim() || !b.metric || !metricByKey(b.metric)) {
    return Response.json({ error: "title and a known metric are required" }, { status: 400 });
  }
  const goal = {
    id: newId("goal"),
    title: b.title.trim(),
    metric: b.metric,
    target: Math.min(1, Math.max(0.01, Number(b.target) || 0.5)),
    createdAt: new Date().toISOString(),
  };
  const store = getStore();
  store.goals.push(goal);
  // A new goal is new information: look for friction against it right away.
  store.lastScanAt = undefined;
  save();
  return Response.json(goal);
}
