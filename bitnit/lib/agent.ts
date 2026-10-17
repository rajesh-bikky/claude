// The "thinking" half of BITNIT: copy editing, outcome projection and
// suggesting new bits from what the product and its users already show.

import { z } from "zod";
import { askClaude, withFallback } from "./ai";
import { FEATURES, PERSONAS, PRODUCT_NAME, featureLabel, personaLabel } from "./catalog";
import { COPY_LIMITS, type Copy } from "./copy";
import { newId } from "./id";
import { analyze } from "./stats";
import { scoreFit } from "./targeting";
import type { Idea, Projection, Store, Suggestion, Targeting } from "./types";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// ---------------------------------------------------------------------------
// Copy: keep the question short and neutral
// ---------------------------------------------------------------------------

const FILLER: [RegExp, string][] = [
  [/\bin order to\b/gi, "to"],
  [/\b(basically|really|very|simply|just|actually|totally)\s+/gi, ""],
  [/\bat this point in time\b/gi, "now"],
  [/\bis able to\b/gi, "can"],
  [/\ba (large|huge) number of\b/gi, "many"],
  [/\bdue to the fact that\b/gi, "because"],
  [/\s{2,}/g, " "],
];

function trimRules(c: Copy): Copy & { notes: string[] } {
  const clean = (s: string) => {
    const out = FILLER.reduce((acc, [re, to]) => acc.replace(re, to), s)
      .trim()
      .replace(/([Aa]) ([aeiou])/g, "$1n $2");
    return out.charAt(0).toUpperCase() + out.slice(1);
  };
  const next = { title: clean(c.title), problem: clean(c.problem), solution: clean(c.solution) };
  const notes = ["Removed filler words. Connect Claude for a full rewrite that keeps your meaning."];
  return { ...next, notes };
}

const TightenSchema = z.object({
  title: z.string(),
  problem: z.string(),
  solution: z.string(),
  notes: z.array(z.string()),
});

export async function tightenCopy(c: Copy) {
  return withFallback(
    () =>
      askClaude({
        schema: TightenSchema,
        effort: "low",
        system:
          "You edit the one-question surveys a product shows its users to decide whether to build a feature. " +
          "Rewrite for brevity and neutrality while keeping the builder's meaning exactly: never add benefits, numbers, or claims that are not in the original. " +
          `Title: a plain noun phrase, at most ${COPY_LIMITS.title} words. ` +
          `"problem" (what it solves): the user's pain in their own words, at most ${COPY_LIMITS.problem} words. ` +
          `"solution" (how it solves it): the concrete mechanism, at most ${COPY_LIMITS.solution} words, no marketing adjectives. ` +
          "Neutral wording matters because leading copy inflates 'badly need it' answers and corrupts the decision. " +
          "In notes, list up to three short observations: what you changed and any leading or ambiguous wording you removed.",
        prompt: `Title: ${c.title}\nWhat it solves: ${c.problem}\nHow it solves it: ${c.solution}`,
      }),
    () => trimRules(c),
  );
}

// ---------------------------------------------------------------------------
// Projection: what will users probably say?
// ---------------------------------------------------------------------------

/**
 * Statistical prior from history, with no knowledge of the idea's wording:
 * past bits are weighted by how much their audience overlaps this one
 * (Jaccard on eligible users), so "bits these same people saw" count most.
 * The weighted spread of those results is the honest uncertainty.
 */
export function audiencePrior(t: Targeting, store: Store, excludeId?: string) {
  const users = Object.values(store.users);
  const eligibleOf = (tt: Targeting) => new Set(users.filter((u) => scoreFit(u, tt).eligible).map((u) => u.id));
  const mine = eligibleOf(t);

  const past = store.ideas
    .filter((i) => i.id !== excludeId)
    .map((i) => ({ i, a: analyze(i, store.responses, store.impressions) }))
    .filter(({ a }) => a.n >= 20)
    .map(({ i, a }) => {
      const theirs = eligibleOf(i.targeting);
      let inter = 0;
      mine.forEach((id) => theirs.has(id) && inter++);
      const union = mine.size + theirs.size - inter;
      const sim = union ? inter / union : 0;
      return { title: i.title, rate: a.need.p, sim, w: sim * sim + 0.02 };
    });

  const W = past.reduce((s, p) => s + p.w, 0);
  const center = W ? past.reduce((s, p) => s + p.w * p.rate, 0) / W : 0.3;
  const sd = W ? Math.sqrt(past.reduce((s, p) => s + p.w * (p.rate - center) ** 2, 0) / W) : 0.2;
  const half = 1.28 * Math.max(sd, 0.1); // ~80% range for a new bit
  const nearest = [...past].sort((a, b) => b.sim - a.sim).slice(0, 2);

  return {
    eligible: mine.size,
    pastBits: past.length,
    nearest,
    needRate: clamp01(center),
    low: clamp01(center - half),
    high: clamp01(center + half),
  };
}

function likely(lo: number, hi: number, bar: number): Projection["likely"] {
  if (lo > bar) return "build";
  if (hi < bar) return "nix";
  return "uncertain";
}

function priorProjection(t: Targeting, bar: number, store: Store, excludeId?: string): Projection {
  const p = audiencePrior(t, store, excludeId);
  const basis = p.pastBits
    ? [
        `Weighted by audience overlap across ${p.pastBits} past bits.`,
        `Closest audiences: ${p.nearest.map((n) => `${n.title} (${pct(n.rate)}, ${pct(n.sim)} overlap)`).join("; ")}.`,
      ]
    : ["No past bits with enough answers yet; using a neutral 30% prior."];
  return { needRate: p.needRate, low: p.low, high: p.high, likely: likely(p.low, p.high, bar), basis, risks: [], source: "prior" };
}

function history(store: Store) {
  return store.ideas
    .map((i) => ({ i, a: analyze(i, store.responses, store.impressions) }))
    .filter(({ a }) => a.n >= 10)
    .map(({ i, a }) => {
      const comments = store.responses.filter((r) => r.ideaId === i.id && r.comment).slice(0, 4).map((r) => `"${r.comment}" (${r.answer})`);
      return (
        `- ${i.title} — ${i.problem} Audience: ${describeTargeting(i.targeting)}. ` +
        `${a.n} answers: ${pct(a.need.p)} badly need, ${pct(a.counts.maybe / a.n)} maybe, ${pct(a.counts.nah / a.n)} won't use.` +
        (comments.length ? ` Comments: ${comments.join("; ")}` : "")
      );
    })
    .join("\n");
}

export function describeTargeting(t: Targeting) {
  const who = t.personas.length ? t.personas.map(personaLabel).join(", ") : "all personas";
  const uses = t.features.length ? t.features.map((f) => `${featureLabel(f.feature)} ≥${f.minUses}×/mo`).join(" or ") : "any usage";
  return `${who}; ${uses}; ≥${t.minTenureDays} days`;
}

const ProjectionSchema = z.object({
  needRate: z.number(),
  low: z.number(),
  high: z.number(),
  basis: z.array(z.string()),
  risks: z.array(z.string()),
});

export async function projectOutcome(bit: Copy & { targeting: Targeting; buildThreshold: number }, store: Store): Promise<Projection> {
  const prior = priorProjection(bit.targeting, bit.buildThreshold, store);
  const res = await withFallback(
    async () => {
      const out = await askClaude({
        schema: ProjectionSchema,
        effort: "medium",
        system:
          `You forecast how users of ${PRODUCT_NAME}, an invoicing and bookkeeping app for small businesses, will answer a one-question survey about a proposed feature. ` +
          "Answers are 'badly need it today', 'maybe', or 'won't use it'. Forecast the share answering 'badly need it' as a fraction 0-1 with an ~80% range. " +
          "Start from the statistical prior you are given and move away from it only for reasons grounded in the feature description, the audience, or what users said about past features. " +
          "Be calibrated: most features land near the middle of what past features got; a wide range is better than false precision. " +
          "basis: 2-4 short sentences citing the evidence you used. risks: up to 3 short reasons the forecast could be wrong.",
        prompt:
          `Proposed feature\nTitle: ${bit.title}\nWhat it solves: ${bit.problem}\nHow it solves it: ${bit.solution}\n` +
          `Audience: ${describeTargeting(bit.targeting)}\nBuild bar: ${pct(bit.buildThreshold)} must badly need it\n\n` +
          `Statistical prior: ${pct(prior.needRate)} (range ${pct(prior.low)}–${pct(prior.high)}). ${prior.basis.join(" ")}\n\n` +
          `Past features and how users answered:\n${history(store) || "(none yet)"}`,
      });
      const lo = clamp01(Math.min(out.low, out.needRate));
      const hi = clamp01(Math.max(out.high, out.needRate));
      return {
        needRate: clamp01(out.needRate),
        low: lo,
        high: hi,
        likely: likely(lo, hi, bit.buildThreshold),
        basis: out.basis,
        risks: out.risks,
        source: "claude" as const,
      };
    },
    () => prior,
  );
  return res.value;
}

// ---------------------------------------------------------------------------
// Suggested bits
// ---------------------------------------------------------------------------

/** Aggregate usage the agent reasons over: per persona, share using each feature and median uses. */
export function usageProfile(store: Store) {
  const users = Object.values(store.users);
  return Object.keys(PERSONAS).map((persona) => {
    const us = users.filter((u) => u.persona === persona);
    const features = Object.keys(FEATURES).map((f) => {
      const vals = us.map((u) => u.featureUsage[f] ?? 0).sort((a, b) => a - b);
      const active = vals.filter((v) => v > 0);
      return { feature: f, share: us.length ? active.length / us.length : 0, median: active.length ? active[Math.floor(active.length / 2)] : 0 };
    });
    return { persona, users: us.length, features };
  });
}

type Draft = Omit<Suggestion, "id" | "projection" | "status" | "createdAt" | "source">;

/** Rule-based ideas: patterns in usage and in what users wrote. Used without Claude. */
function ruleSuggestions(store: Store): Draft[] {
  const prof = usageProfile(store);
  const get = (p: string, f: string) => prof.find((x) => x.persona === p)!.features.find((x) => x.feature === f)!;
  const comments = store.responses.filter((r) => r.comment).map((r) => r.comment!);
  const quote = (re: RegExp) => comments.find((c) => re.test(c));
  const out: Draft[] = [];

  const rates = quote(/rate/i);
  if (rates) {
    const a = get("agency", "time_tracking");
    out.push({
      title: "Per-project billing rates",
      problem: "One hourly rate per client doesn't fit work billed at different rates per project or role.",
      solution: "Set a rate on each project or team member; tracked time is priced automatically on invoices.",
      targeting: { personas: ["agency", "freelancer"], features: [{ feature: "time_tracking", minUses: 10 }], minTenureDays: 14, minFit: 0.45 },
      effortWeeks: 3,
      rationale: "Users raised it unprompted while answering a related bit.",
      evidence: [`A user wrote: “${rates}”`, `${pct(a.share)} of agency owners track time (median ${a.median}×/mo).`],
    });
  }
  const tone = quote(/tone/i);
  if (tone) {
    out.push({
      title: "Custom reminder wording",
      problem: "Automated payment reminders can sound off-brand or too blunt for some clients.",
      solution: "Edit the wording of each reminder step, with a preview, and pick a tone per client.",
      targeting: { personas: ["freelancer", "agency", "smb"], features: [{ feature: "invoices", minUses: 10 }], minTenureDays: 14, minFit: 0.45 },
      effortWeeks: 1,
      rationale: "A follow-on to the strongest-demand bit; users asked for control over it.",
      evidence: [`A user wrote: “${tone}”`],
    });
  }
  const acc = get("accountant", "expenses");
  const accR = get("accountant", "reports");
  if (acc.share > 0.5 && accR.share > 0.5) {
    out.push({
      title: "Expense categorization rules",
      problem: "Categorizing the same vendors' expenses by hand every month is slow and error-prone.",
      solution: "Create rules like “Uber → Travel” that categorize matching expenses automatically.",
      targeting: { personas: ["accountant", "smb"], features: [{ feature: "expenses", minUses: 10 }], minTenureDays: 30, minFit: 0.45 },
      effortWeeks: 2,
      rationale: "Accountants are the heaviest expense and report users — repetitive categorization sits between the two.",
      evidence: [`${pct(acc.share)} of accountants use Expenses (median ${acc.median}×/mo) and ${pct(accR.share)} use Reports (median ${accR.median}×/mo).`],
    });
  }
  const cp = get("agency", "client_portal");
  if (cp.share > 0.5) {
    out.push({
      title: "Invoice approval in the client portal",
      problem: "Clients dispute invoices after they're sent, which delays payment by weeks.",
      solution: "Clients approve or question a draft invoice in the portal before it's issued.",
      targeting: { personas: ["agency"], features: [{ feature: "client_portal", minUses: 8 }], minTenureDays: 30, minFit: 0.5 },
      effortWeeks: 4,
      rationale: "Agency owners lean on the client portal far more than other personas.",
      evidence: [`${pct(cp.share)} of agency owners use the Client portal (median ${cp.median}×/mo).`],
    });
  }
  const smb = get("smb", "invoices");
  out.push({
    title: "Recurring invoices",
    problem: "Re-creating the same monthly invoice for retainer clients is tedious and easy to forget.",
    solution: "Set an invoice to repeat on a schedule; Ledgerly creates and sends each one automatically.",
    targeting: { personas: ["smb", "freelancer"], features: [{ feature: "invoices", minUses: 8 }], minTenureDays: 30, minFit: 0.4 },
    effortWeeks: 2,
    rationale: "Invoicing is the most-used feature for small-business owners and freelancers.",
    evidence: [`${pct(smb.share)} of small-business owners invoice (median ${smb.median}×/mo).`],
  });
  return out;
}

const SuggestSchema = z.object({
  suggestions: z.array(
    z.object({
      title: z.string(),
      problem: z.string(),
      solution: z.string(),
      personas: z.array(z.string()),
      features: z.array(z.object({ feature: z.string(), minUses: z.number() })),
      minTenureDays: z.number(),
      effortWeeks: z.number(),
      rationale: z.string(),
      evidence: z.array(z.string()),
    }),
  ),
});

async function claudeSuggestions(store: Store): Promise<Draft[]> {
  const prof = usageProfile(store)
    .map((p) => `${personaLabel(p.persona)} (${p.users} users): ` + p.features.map((f) => `${f.feature} used by ${pct(f.share)}, median ${f.median}×/mo`).join("; "))
    .join("\n");
  const existing = store.ideas.map((i) => `- ${i.title} [${i.status}${i.decision ? `, decided ${i.decision.verdict}` : ""}]`).join("\n");
  const pending = store.suggestions.filter((s) => s.status !== "accepted").map((s) => `- ${s.title} [${s.status}]`).join("\n");

  const out = await askClaude({
    schema: SuggestSchema,
    effort: "medium",
    system:
      `You are the product-discovery agent inside ${PRODUCT_NAME}, an invoicing and bookkeeping app for small businesses. ` +
      "Propose small, concrete features worth validating with users, grounded in the usage data and in what users have said. " +
      "Every suggestion must cite specific evidence from the data you were given — no generic SaaS ideas. " +
      "Skip anything already listed as a bit or a previous suggestion, and avoid features similar to ones users rejected. " +
      `Use only these persona keys: ${Object.keys(PERSONAS).join(", ")}; and these feature keys: ${Object.keys(FEATURES).join(", ")}. ` +
      `Write copy that is short and neutral: title ≤ ${COPY_LIMITS.title} words, problem and solution ≤ ${COPY_LIMITS.problem} words each, no marketing adjectives. ` +
      "minUses is the monthly usage of that feature a user needs to be asked. effortWeeks is a rough engineering estimate. Propose 4 suggestions.",
    prompt: `Usage by persona (last 30 days):\n${prof}\n\nBits so far and how users answered:\n${history(store) || "(none)"}\n\nAll bit titles:\n${existing}\n\nPrevious suggestions:\n${pending || "(none)"}`,
  });

  return out.suggestions.map((s) => ({
    title: s.title,
    problem: s.problem,
    solution: s.solution,
    targeting: {
      personas: s.personas.filter((p) => p in PERSONAS),
      features: s.features.filter((f) => f.feature in FEATURES).map((f) => ({ feature: f.feature, minUses: Math.max(1, Math.round(f.minUses)) })),
      minTenureDays: Math.max(0, Math.round(s.minTenureDays)),
      minFit: 0.45,
    },
    effortWeeks: Math.max(0.5, Math.round(s.effortWeeks * 2) / 2),
    rationale: s.rationale,
    evidence: s.evidence,
  }));
}

const DEFAULT_BAR = 0.35;

/** Generate fresh suggestions, project each, and add them to the review queue. */
export async function generateSuggestions(store: Store): Promise<{ added: Suggestion[]; source: "claude" | "rules"; error?: string }> {
  const taken = new Set([...store.ideas.map((i) => i.title.toLowerCase()), ...store.suggestions.map((s) => s.title.toLowerCase())]);
  const res = await withFallback(() => claudeSuggestions(store), () => ruleSuggestions(store));
  const fresh = res.value.filter((d) => !taken.has(d.title.toLowerCase()));

  const added: Suggestion[] = [];
  for (const d of fresh) {
    const projection = await projectOutcome({ ...d, buildThreshold: DEFAULT_BAR }, store);
    added.push({ ...d, id: newId("sug"), projection, status: "pending", source: res.source, createdAt: new Date().toISOString() });
  }
  store.suggestions.unshift(...added);
  return { added, source: res.source, error: res.error };
}

/** Synchronous, rules-only variant used when building the sample data. */
export function seedSuggestions(store: Store) {
  for (const d of ruleSuggestions(store)) {
    store.suggestions.push({
      ...d,
      id: newId("sug"),
      projection: priorProjection(d.targeting, DEFAULT_BAR, store),
      status: "pending",
      source: "rules",
      createdAt: new Date().toISOString(),
    });
  }
}

export { priorProjection };
export type { Copy };

/** Bits the builder already launched get their projection stored, so it can be compared with reality. */
export function projectionVsActual(idea: Idea, store: Store) {
  if (!idea.projection) return null;
  const a = analyze(idea, store.responses, store.impressions);
  if (a.n < 10) return null;
  const inside = a.need.p >= idea.projection.low && a.need.p <= idea.projection.high;
  return { projected: idea.projection, actual: a.need.p, inside };
}

