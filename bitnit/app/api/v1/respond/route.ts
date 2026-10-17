import { json, preflight } from "@/lib/cors";
import { getStore, newId, save } from "@/lib/store";
import { scoreFit } from "@/lib/targeting";
import type { Answer } from "@/lib/types";

export const OPTIONS = preflight;

const ANSWERS: Answer[] = ["need", "maybe", "nah"];

export async function POST(req: Request) {
  const body = (await req.json()) as { ideaId?: string; userId?: string; answer?: Answer; comment?: string; contactOk?: boolean };
  const store = getStore();
  const idea = store.ideas.find((i) => i.id === body.ideaId);
  const user = body.userId ? store.users[body.userId] : undefined;
  if (!idea || !user || !body.answer || !ANSWERS.includes(body.answer)) {
    return json({ error: "ideaId, a known userId and answer (need|maybe|nah) are required" }, 400);
  }

  const comment = body.comment?.trim().slice(0, 500) || undefined;
  const existing = store.responses.find((r) => r.ideaId === idea.id && r.userId === user.id);
  if (existing) {
    // A follow-up comment, or a changed mind — keep one response per person.
    existing.answer = body.answer;
    if (comment) existing.comment = comment;
    if (body.contactOk) existing.contactOk = true;
  } else {
    store.responses.push({
      id: newId("r"),
      ideaId: idea.id,
      userId: user.id,
      answer: body.answer,
      comment,
      contactOk: body.contactOk || undefined,
      fit: scoreFit(user, idea.targeting).fit,
      persona: user.persona,
      createdAt: new Date().toISOString(),
    });
  }
  save();
  return json({ ok: true });
}
