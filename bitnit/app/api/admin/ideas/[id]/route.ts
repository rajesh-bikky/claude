import { getStore, save } from "@/lib/store";
import type { Idea } from "@/lib/types";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/ideas/[id]">) {
  const { id } = await ctx.params;
  const store = getStore();
  const idea = store.ideas.find((i) => i.id === id);
  if (!idea) return Response.json({ error: "not found" }, { status: 404 });

  const b = (await req.json()) as Partial<Idea> & { decide?: { verdict: "build" | "nix"; note?: string } };
  if (b.status && ["draft", "live", "paused"].includes(b.status)) {
    idea.status = b.status;
    delete idea.decision;
  }
  if (b.buildThreshold !== undefined) idea.buildThreshold = Math.min(0.9, Math.max(0.05, Number(b.buildThreshold)));
  if (b.targetSample !== undefined) idea.targetSample = Math.max(10, Math.round(Number(b.targetSample)));
  if (b.decide) {
    idea.status = "decided";
    idea.decision = { verdict: b.decide.verdict, note: b.decide.note ?? "", at: new Date().toISOString() };
  }
  save();
  return Response.json(idea);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/admin/ideas/[id]">) {
  const { id } = await ctx.params;
  const store = getStore();
  store.ideas = store.ideas.filter((i) => i.id !== id);
  store.responses = store.responses.filter((r) => r.ideaId !== id);
  store.impressions = store.impressions.filter((i) => i.ideaId !== id);
  save();
  return Response.json({ ok: true });
}
