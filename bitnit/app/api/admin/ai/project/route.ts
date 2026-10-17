import { projectOutcome, type Copy } from "@/lib/agent";
import { getStore } from "@/lib/store";
import type { Targeting } from "@/lib/types";

export async function POST(req: Request) {
  const b = (await req.json()) as Copy & { targeting: Targeting; buildThreshold: number };
  return Response.json(await projectOutcome(b, getStore()));
}
