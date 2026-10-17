import { getStore } from "@/lib/store";
import { audience } from "@/lib/targeting";
import type { Targeting } from "@/lib/types";

export async function POST(req: Request) {
  const t = (await req.json()) as Targeting;
  return Response.json(audience(t, Object.values(getStore().users)));
}
