import { getStore, save } from "@/lib/store";

export async function PATCH(req: Request) {
  const b = (await req.json()) as { maxBitsPer30d?: number };
  const store = getStore();
  if (b.maxBitsPer30d !== undefined) store.settings.maxBitsPer30d = Math.min(10, Math.max(1, Math.round(Number(b.maxBitsPer30d))));
  save();
  return Response.json(store.settings);
}
