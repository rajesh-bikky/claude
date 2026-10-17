import { featureLabel, personaLabel } from "./catalog";
import type { HostUser, Idea, Store, Targeting } from "./types";

export type FitResult = {
  eligible: boolean;
  /** 0..1 — how well this user matches the people the idea is for. */
  fit: number;
  /** Human-readable reasons, strongest first. */
  reasons: string[];
  /** Why the user was ruled out, when not eligible. */
  blockers: string[];
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * Score how well a user fits an idea's audience.
 *
 * Fit blends three signals:
 *  - persona match (35%) — is this the kind of user the idea is for?
 *  - engagement with the relevant features (50%) — heavy users of the feature
 *    the idea extends are the people whose answer matters most;
 *  - tenure (15%) — people who have lived with the product know its gaps.
 */
export function scoreFit(user: HostUser, t: Targeting): FitResult {
  const reasons: string[] = [];
  const blockers: string[] = [];

  const personaOk = t.personas.length === 0 || t.personas.includes(user.persona);
  const personaScore = t.personas.length === 0 ? 0.6 : personaOk ? 1 : 0;
  if (personaOk && t.personas.length > 0) reasons.push(`${personaLabel(user.persona)} — a target persona`);
  if (!personaOk) blockers.push(`${personaLabel(user.persona)} isn't a target persona`);

  let engagement = 0.5;
  let featureGateOk = true;
  if (t.features.length > 0) {
    const per = t.features.map((r) => {
      const uses = user.featureUsage[r.feature] ?? 0;
      // Log-scaled: the minimum is worth ~0.5, and only ~6x the minimum is a full score.
      const score = clamp01(Math.log1p(uses) / Math.log1p(Math.max(1, r.minUses) * 6));
      return { ...r, uses, score, met: uses >= r.minUses };
    });
    featureGateOk = per.some((p) => p.met);
    engagement = Math.max(...per.map((p) => p.score));
    per
      .filter((p) => p.met)
      .sort((a, b) => b.uses - a.uses)
      .forEach((p) => reasons.push(`Uses ${featureLabel(p.feature)} ${p.uses}× a month`));
    if (!featureGateOk) {
      blockers.push(
        `Below the usage bar on ${per.map((p) => `${featureLabel(p.feature)} (${p.uses}/${p.minUses})`).join(", ")}`,
      );
    }
  }

  const tenureOk = user.tenureDays >= t.minTenureDays;
  const tenureScore = clamp01(user.tenureDays / Math.max(365, t.minTenureDays * 2));
  if (!tenureOk) blockers.push(`Only ${user.tenureDays} days on the product (needs ${t.minTenureDays})`);
  else if (user.tenureDays >= 180) reasons.push(`A customer for ${Math.round(user.tenureDays / 30)} months`);

  const fit = Math.round((0.35 * personaScore + 0.5 * engagement + 0.15 * tenureScore) * 100) / 100;
  if (personaOk && featureGateOk && tenureOk && fit < t.minFit) {
    blockers.push(`Fit ${fit.toFixed(2)} is under the ${t.minFit.toFixed(2)} bar`);
  }

  return {
    eligible: personaOk && featureGateOk && tenureOk && fit >= t.minFit,
    fit,
    reasons,
    blockers,
  };
}

/** One-line "why you're seeing this" shown in the widget. */
export function whyYou(fit: FitResult): string {
  const usage = fit.reasons.find((r) => r.startsWith("Uses "));
  if (usage) return `You're seeing this because you use ${usage.slice(5)}.`;
  return `You're seeing this because you're one of the people this would be built for.`;
}

export type Pick = { idea: Idea; fit: FitResult };

/**
 * The agent's choice: of the live ideas this user hasn't already answered or
 * dismissed, ask about the one they fit best — nudged toward ideas that are
 * furthest from their target sample, so evidence accumulates where it's missing.
 */
export function pickIdeaFor(user: HostUser, store: Store): Pick | null {
  const seen = new Set(
    store.impressions
      .filter((i) => i.userId === user.id && i.dismissed)
      .map((i) => i.ideaId)
      .concat(store.responses.filter((r) => r.userId === user.id).map((r) => r.ideaId)),
  );

  let best: { pick: Pick; score: number } | null = null;
  for (const idea of store.ideas) {
    if (idea.status !== "live" || seen.has(idea.id)) continue;
    const fit = scoreFit(user, idea.targeting);
    if (!fit.eligible) continue;
    const collected = store.responses.filter((r) => r.ideaId === idea.id).length;
    const deficit = clamp01(1 - collected / idea.targetSample);
    const score = fit.fit * 0.75 + deficit * 0.25;
    if (!best || score > best.score) best = { pick: { idea, fit }, score };
  }
  return best?.pick ?? null;
}

/** How many known users the targeting would reach — shown while drafting an idea. */
export function audience(t: Targeting, users: HostUser[]) {
  const scored = users.map((u) => ({ u, f: scoreFit(u, t) }));
  const eligible = scored.filter((s) => s.f.eligible);
  return {
    total: users.length,
    eligible: eligible.length,
    avgFit: eligible.length ? eligible.reduce((a, s) => a + s.f.fit, 0) / eligible.length : 0,
    byPersona: Object.entries(
      eligible.reduce<Record<string, number>>((acc, s) => {
        acc[s.u.persona] = (acc[s.u.persona] ?? 0) + 1;
        return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1]),
  };
}
