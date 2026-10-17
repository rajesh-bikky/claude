import { personaLabel } from "./catalog";
import type { Answer, Idea, Impression, Response } from "./types";

// ---------- distributions ----------

/** Standard normal CDF (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7). */
export function normCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

function lnGamma(x: number): number {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2,
    -0.5395239384953e-5,
  ];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (const ci of c) ser += ci / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/** Regularized lower incomplete gamma P(a, x). */
function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  const gln = lnGamma(a);
  if (x < a + 1) {
    let sum = 1 / a;
    let del = sum;
    for (let n = 1; n < 200; n++) {
      del *= x / (a + n);
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - gln);
  }
  // Continued fraction for Q, then P = 1 - Q.
  let b = x + 1 - a;
  let c = 1e300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - gln) * h;
}

export const chiSquarePValue = (x: number, df: number) => 1 - gammaP(df / 2, x / 2);

// ---------- estimators ----------

const Z95 = 1.959964;

/** Wilson score interval — well-behaved at small n and near 0 or 1, unlike p ± z·se. */
export function wilson(successes: number, n: number, z = Z95) {
  if (n === 0) return { p: 0, lo: 0, hi: 1 };
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { p, lo: Math.max(0, center - half), hi: Math.min(1, center + half) };
}

/** Two-proportion z-test (pooled). Returns the two-sided p-value. */
export function twoProportion(x1: number, n1: number, x2: number, n2: number) {
  if (n1 === 0 || n2 === 0) return { diff: 0, z: 0, p: 1 };
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pool = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pool * (1 - pool) * (1 / n1 + 1 / n2));
  const z = se === 0 ? 0 : (p1 - p2) / se;
  return { diff: p1 - p2, z, p: 2 * (1 - normCdf(Math.abs(z))) };
}

// ---------- the analysis ----------

export type Verdict = "build" | "nix" | "inconclusive" | "collecting";

export type Analysis = {
  n: number;
  counts: Record<Answer, number>;
  impressions: number;
  dismissals: number;
  responseRate: number;
  need: { p: number; lo: number; hi: number };
  threshold: number;
  /** One-sided p-value for the direction the data leans (H0: need rate = threshold). */
  pValue: number;
  confidence: number;
  verdict: Verdict;
  /** Responses still needed to settle an inconclusive result, if estimable. */
  moreNeeded: number | null;
  fitWeightedNeed: number;
  core: { n: number; need: number; minFit: number } | null;
  rest: { n: number; need: number } | null;
  coreVsRestP: number | null;
  personas: { persona: string; n: number; need: number; maybe: number; nah: number }[];
  personaChi: { chi2: number; df: number; p: number } | null;
  narrative: string[];
};

const MIN_RESPONSES = 20;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const fmtP = (p: number) => (p < 0.001 ? "p < 0.001" : `p = ${p.toFixed(3)}`);

export function analyze(idea: Idea, responses: Response[], impressions: Impression[]): Analysis {
  const rs = responses.filter((r) => r.ideaId === idea.id);
  const imps = impressions.filter((i) => i.ideaId === idea.id);
  const n = rs.length;
  const counts: Record<Answer, number> = { need: 0, maybe: 0, nah: 0 };
  rs.forEach((r) => counts[r.answer]++);

  const T = idea.buildThreshold;
  const need = wilson(counts.need, n);
  const se0 = Math.sqrt((T * (1 - T)) / Math.max(n, 1));
  const z = n ? (need.p - T) / se0 : 0;
  const pValue = need.p >= T ? 1 - normCdf(z) : normCdf(z);

  let verdict: Verdict;
  if (n < Math.min(MIN_RESPONSES, idea.targetSample)) verdict = "collecting";
  else if (need.lo > T) verdict = "build";
  else if (need.hi < T) verdict = "nix";
  else verdict = "inconclusive";

  let moreNeeded: number | null = null;
  if (verdict === "inconclusive" || verdict === "collecting") {
    const gap = Math.abs(need.p - T);
    const p = n ? need.p : T;
    if (gap >= 0.02) moreNeeded = Math.max(0, Math.ceil((Z95 * Z95 * p * (1 - p)) / (gap * gap)) - n);
    if (verdict === "collecting") moreNeeded = Math.max(moreNeeded ?? 0, MIN_RESPONSES - n);
  }

  const wSum = rs.reduce((a, r) => a + r.fit, 0);
  const fitWeightedNeed = wSum ? rs.reduce((a, r) => a + (r.answer === "need" ? r.fit : 0), 0) / wSum : 0;

  // Split respondents at the median fit: the better-fitting half vs the rest.
  const byFit = [...rs].sort((x, y) => y.fit - x.fit);
  const coreRs = byFit.slice(0, Math.ceil(byFit.length / 2));
  const restRs = byFit.slice(Math.ceil(byFit.length / 2));
  const coreFit = coreRs.length ? coreRs[coreRs.length - 1].fit : 0;
  const nNeed = (xs: Response[]) => xs.filter((r) => r.answer === "need").length;
  const core = coreRs.length ? { n: coreRs.length, need: nNeed(coreRs) / coreRs.length, minFit: coreFit } : null;
  const rest = restRs.length ? { n: restRs.length, need: nNeed(restRs) / restRs.length } : null;
  const coreVsRestP =
    coreRs.length >= 5 && restRs.length >= 5
      ? twoProportion(nNeed(coreRs), coreRs.length, nNeed(restRs), restRs.length).p
      : null;

  const byPersona = new Map<string, Record<Answer, number>>();
  rs.forEach((r) => {
    const c = byPersona.get(r.persona) ?? { need: 0, maybe: 0, nah: 0 };
    c[r.answer]++;
    byPersona.set(r.persona, c);
  });
  const personas = [...byPersona.entries()]
    .map(([persona, c]) => ({ persona, n: c.need + c.maybe + c.nah, ...c }))
    .sort((a, b) => b.n - a.n);

  // Chi-square test of independence: does the answer depend on persona?
  let personaChi: Analysis["personaChi"] = null;
  const rows = personas.filter((p) => p.n >= 5);
  const answers: Answer[] = ["need", "maybe", "nah"];
  const cols = answers.filter((a) => rows.some((r) => r[a] > 0));
  if (rows.length >= 2 && cols.length >= 2) {
    const total = rows.reduce((a, r) => a + r.n, 0);
    const colTot = cols.map((a) => rows.reduce((s, r) => s + r[a], 0));
    let chi2 = 0;
    rows.forEach((r) =>
      cols.forEach((a, j) => {
        const e = (r.n * colTot[j]) / total;
        if (e > 0) chi2 += (r[a] - e) ** 2 / e;
      }),
    );
    const df = (rows.length - 1) * (cols.length - 1);
    personaChi = { chi2, df, p: chiSquarePValue(chi2, df) };
  }

  const narrative: string[] = [];
  const ci = `${pct(need.lo)}–${pct(need.hi)}`;
  if (verdict === "collecting") {
    narrative.push(
      `Only ${n} response${n === 1 ? "" : "s"} so far — too early to call. Keep the question live for at least ${moreNeeded} more.`,
    );
  } else if (verdict === "build") {
    narrative.push(
      `Build it. ${pct(need.p)} of targeted users say they badly need this today (95% CI ${ci}), clearing your ${pct(T)} bar (${fmtP(pValue)}).`,
    );
  } else if (verdict === "nix") {
    narrative.push(
      `Nix it. Only ${pct(need.p)} badly need it (95% CI ${ci}) — confidently under your ${pct(T)} bar (${fmtP(pValue)}).`,
    );
  } else {
    narrative.push(
      `Not settled yet. ${pct(need.p)} badly need it, but the 95% CI (${ci}) still straddles your ${pct(T)} bar.` +
        (moreNeeded ? ` Roughly ${moreNeeded} more responses should settle it.` : ` Demand is within two points of the bar — more data won't move it much; decide on strategy.`),
    );
  }
  if (n > 0 && counts.nah / n >= 0.5) {
    narrative.push(`${pct(counts.nah / n)} said they wouldn't use it at all — a strong signal the problem isn't felt widely.`);
  }
  if (core && rest && coreVsRestP !== null) {
    if (coreVsRestP < 0.05) {
      const more = core.need > rest.need;
      narrative.push(
        `Your best-fit half of respondents ${more ? "want it much more" : "want it less"}: ${pct(core.need)} vs ${pct(rest.need)} (${fmtP(coreVsRestP)}). ` +
          (more ? `Consider scoping it as a power-user feature.` : `It may appeal to casual users more than your core.`),
      );
    } else {
      narrative.push(`Demand is similar in the best-fit and less-fit halves (${pct(core.need)} vs ${pct(rest.need)}, ${fmtP(coreVsRestP)}).`);
    }
  }
  if (personaChi && personaChi.p < 0.05) {
    const top = [...rows].sort((a, b) => b.need / b.n - a.need / a.n)[0];
    narrative.push(
      `Answers differ by persona (χ² = ${personaChi.chi2.toFixed(1)}, ${fmtP(personaChi.p)}); ${personaLabel(top.persona)}s lead at ${pct(top.need / top.n)} badly needing it.`,
    );
  }
  const responseRate = imps.length ? n / imps.length : 0;
  if (imps.length >= 20 && responseRate < 0.25) {
    narrative.push(`Response rate is low (${pct(responseRate)}); results may over-represent people with strong opinions.`);
  }

  return {
    n,
    counts,
    impressions: imps.length,
    dismissals: imps.filter((i) => i.dismissed).length,
    responseRate,
    need,
    threshold: T,
    pValue,
    confidence: 1 - pValue,
    verdict,
    moreNeeded,
    fitWeightedNeed,
    core,
    rest,
    coreVsRestP,
    personas,
    personaChi,
    narrative,
  };
}
