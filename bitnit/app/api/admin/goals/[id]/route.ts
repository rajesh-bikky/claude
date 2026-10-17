import { getStore, save } from "@/lib/store";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/admin/goals/[id]">) {
  const { id } = await ctx.params;
  const store = getStore();
  store.goals = store.goals.filter((g) => g.id !== id);
  save();
  return Response.json({ ok: true });
}
