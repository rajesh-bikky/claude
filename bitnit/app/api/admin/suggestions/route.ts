import { scout } from "@/lib/agent";
import { getStore, save } from "@/lib/store";

export async function POST() {
  const store = getStore();
  const res = await scout(store);
  save();
  return Response.json({ added: res.added.length, source: res.source, error: res.error });
}
