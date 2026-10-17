import { getStore, save } from "@/lib/store";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/suggestions/[id]">) {
  const { id } = await ctx.params;
  const { status } = (await req.json()) as { status?: "pending" | "discarded" };
  const s = getStore().suggestions.find((x) => x.id === id);
  if (!s) return Response.json({ error: "not found" }, { status: 404 });
  if (status === "pending" || status === "discarded") s.status = status;
  save();
  return Response.json(s);
}
