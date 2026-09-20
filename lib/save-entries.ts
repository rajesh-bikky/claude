import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { categorizeTranscript, categorizeAudio, type CategorizedEntry } from "@/lib/categorize";
import { convertToWav } from "@/lib/audio";

async function getExistingLabels(): Promise<string[]> {
  const rows = await db.entry.findMany({
    where: { category: "todo", label: { not: null } },
    distinct: ["label"],
    select: { label: true },
  });
  return rows.map((r) => r.label).filter((l): l is string => Boolean(l));
}

function parseDueDate(dueDate: string | null): Date | null {
  if (!dueDate) return null;
  return new Date(`${dueDate}T00:00:00`);
}

async function persist(categorizedIn: CategorizedEntry[], fallbackText: string) {
  const categorized = categorizedIn.length > 0
    ? categorizedIn
    // Fall back to a single uncategorized "thought" rather than losing the capture.
    : [{ text: fallbackText, category: "thought" as const, label: null, dueDate: null }];

  const sessionId = randomUUID();
  await db.entry.createMany({
    data: categorized.map((e) => ({
      sessionId,
      text: e.text,
      category: e.category,
      label: e.label,
      dueDate: parseDueDate(e.dueDate),
    })),
  });

  return { sessionId, entries: categorized };
}

export async function saveTranscript(transcript: string) {
  if (!transcript.trim()) {
    return { sessionId: null, entries: [] as CategorizedEntry[] };
  }

  const existingLabels = await getExistingLabels();

  let categorized: CategorizedEntry[];
  try {
    categorized = await categorizeTranscript(transcript, existingLabels);
  } catch (err) {
    console.error("Categorization failed, retrying once:", err);
    categorized = await categorizeTranscript(transcript, existingLabels);
  }

  return persist(categorized, transcript);
}

export async function saveAudio(audio: Buffer, mimeType: string) {
  const wav = await convertToWav(audio, mimeType);
  const existingLabels = await getExistingLabels();

  let categorized: CategorizedEntry[];
  try {
    categorized = await categorizeAudio(wav, "audio/wav", existingLabels);
  } catch (err) {
    console.error("Categorization failed, retrying once:", err);
    categorized = await categorizeAudio(wav, "audio/wav", existingLabels);
  }

  if (categorized.length === 0) {
    // Nothing usable came back and we have no transcript to fall back to.
    return { sessionId: null, entries: [] as CategorizedEntry[] };
  }

  return persist(categorized, "");
}
