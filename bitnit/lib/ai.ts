import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

// Thin wrapper around Claude with structured output. Every caller has a
// rule-based fallback, so BITNIT keeps working without credentials.

const MODEL = "claude-opus-5-5";

/** True when credentials are configured. The SDK reads them from the environment. */
export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let client: Anthropic | null = null;

export async function askClaude<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  prompt: string;
  effort: "low" | "medium" | "high";
}): Promise<z.infer<S>> {
  client ??= new Anthropic();
  const res = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // Server-side fallback: if a safety classifier declines, the API retries on
    // Anthropic's recommended fallback model instead of returning a refusal.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) },
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });
  if (res.stop_reason === "refusal") throw new Error("Claude declined the request");
  if (!res.parsed_output) throw new Error(`No structured output (stop_reason: ${res.stop_reason})`);
  return res.parsed_output as z.infer<S>;
}

/** Run the Claude path when configured; fall back to rules on absence or any failure. */
export async function withFallback<T>(
  claude: () => Promise<T>,
  rules: () => T,
): Promise<{ value: T; source: "claude" | "rules"; error?: string }> {
  if (!aiConfigured()) return { value: rules(), source: "rules" };
  try {
    return { value: await claude(), source: "claude" };
  } catch (e) {
    console.error("[bitnit] Claude call failed, using rules:", e);
    return { value: rules(), source: "rules", error: e instanceof Error ? e.message : String(e) };
  }
}
