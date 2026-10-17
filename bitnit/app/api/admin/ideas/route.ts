import { getStore, newId, save } from "@/lib/store";
import type { Idea } from "@/lib/types";

export async function POST(req: Request) {
  const b = (await req.json()) as Partial<Idea>;
  if (!b.title?.trim() || !b.problem?.trim() || !b.solution?.trim() || !b.targeting) {
    return Response.json({ error: "title, problem, solution and targeting are required" }, { status: 400 });
  }
  const idea: Idea = {
    id: newId("idea"),
    title: b.title.trim(),
    problem: b.problem.trim(),
    solution: b.solution.trim(),
    status: b.status === "live" ? "live" : "draft",
    targeting: b.targeting,
    buildThreshold: Math.min(0.9, Math.max(0.05, Number(b.buildThreshold) || 0.35)),
    targetSample: Math.max(10, Math.round(Number(b.targetSample) || 100)),
    effortWeeks: Number(b.effortWeeks) > 0 ? Number(b.effortWeeks) : undefined,
    projection: b.projection,
    fromSuggestion: b.fromSuggestion,
    goalId: b.goalId || undefined,
    createdAt: new Date().toISOString(),
  };
  const store = getStore();
  store.ideas.unshift(idea);
  const sug = store.suggestions.find((s) => s.id === b.fromSuggestion);
  if (sug) sug.status = "accepted";
  save();
  return Response.json(idea);
}
