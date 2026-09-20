import { GoogleGenAI, Type } from "@google/genai";

const CATEGORIES = ["todo", "idea", "thought"] as const;
export type Category = (typeof CATEGORIES)[number];

export type CategorizedEntry = {
  text: string;
  category: Category;
  label: string | null;
  dueDate: string | null; // "YYYY-MM-DD"
};

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function systemInstructionFor(today: Date): string {
  const todayStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    "You transcribe and segment a rambling voice memo into distinct thoughts, then categorize each one. " +
    "The speaker may cover several unrelated topics in one recording — segment them into separate entries " +
    "rather than one big blob. Transcribe accurately: preserve the speaker's actual words and intent rather " +
    "than guessing at a plausible-sounding sentence. If a short stretch of audio is unclear, transcribe your " +
    "best interpretation rather than inventing unrelated content.\n\n" +
    `Today is ${todayStr}. If the speaker mentions when something is due or should happen (e.g. "tomorrow", ` +
    '"next Friday", "in two weeks", "by the 5th"), resolve it to an absolute calendar date relative to today ' +
    "and put it in dueDate as YYYY-MM-DD. If no date or timeframe is mentioned for a thought, leave dueDate empty — do not guess a date."
  );
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    entries: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description:
              "One distinct thought, cleaned into a clear standalone sentence in the speaker's own words. Do not merge unrelated thoughts.",
          },
          category: {
            type: Type.STRING,
            enum: [...CATEGORIES],
            description:
              "'todo' = an action the speaker needs to take. 'idea' = a concept, plan, or creative thought to develop. 'thought' = an observation, feeling, or note with no action or idea attached.",
          },
          label: {
            type: Type.STRING,
            description:
              "Only for category='todo': a short (1-2 word) life-area label, e.g. 'kids', 'finance', 'subscriptions'. Reuse one of the existing labels provided if it's a close fit; only invent a new short label if none are close. Empty string for 'idea' or 'thought'.",
          },
          dueDate: {
            type: Type.STRING,
            description:
              "The resolved absolute due date as YYYY-MM-DD, only if the speaker actually referenced a date/timeframe for this thought. Empty string if no date was mentioned.",
          },
        },
        required: ["text", "category", "label", "dueDate"],
      },
    },
  },
  required: ["entries"],
};

function labelHintFor(existingLabels: string[]): string {
  return existingLabels.length > 0
    ? `Existing to-do labels already in use, reuse one of these when it fits closely: ${existingLabels.join(", ")}.`
    : "No to-do labels exist yet — invent short, sensible ones as needed.";
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseEntries(raw: string | undefined): CategorizedEntry[] {
  if (!raw) return [];
  const parsed = JSON.parse(raw) as {
    entries?: Array<{ text: string; category: string; label: string; dueDate: string }>;
  };
  const entries = parsed.entries ?? [];

  return entries
    .filter((e) => e.text?.trim() && (CATEGORIES as readonly string[]).includes(e.category))
    .map((e) => ({
      text: e.text.trim(),
      category: e.category as Category,
      label: e.category === "todo" && e.label?.trim() ? e.label.trim() : null,
      dueDate: e.dueDate && DATE_RE.test(e.dueDate.trim()) ? e.dueDate.trim() : null,
    }));
}

export async function categorizeTranscript(
  transcript: string,
  existingLabels: string[],
): Promise<CategorizedEntry[]> {
  const response = await client.models.generateContent({
    model: "gemini-3.6-flash",
    contents: `${labelHintFor(existingLabels)}\n\nTranscript:\n"""\n${transcript}\n"""`,
    config: {
      systemInstruction: systemInstructionFor(new Date()),
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  return parseEntries(response.text);
}

export async function categorizeAudio(
  audio: Buffer,
  mimeType: string,
  existingLabels: string[],
): Promise<CategorizedEntry[]> {
  const response = await client.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: `${labelHintFor(existingLabels)}\n\nListen to this voice memo.` },
          { inlineData: { mimeType, data: audio.toString("base64") } },
        ],
      },
    ],
    config: {
      systemInstruction: systemInstructionFor(new Date()),
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  return parseEntries(response.text);
}
