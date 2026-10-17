import { tightenCopy, type Copy } from "@/lib/agent";

export async function POST(req: Request) {
  const c = (await req.json()) as Copy;
  const res = await tightenCopy({ title: c.title ?? "", problem: c.problem ?? "", solution: c.solution ?? "" });
  return Response.json({ ...res.value, source: res.source, error: res.error });
}
