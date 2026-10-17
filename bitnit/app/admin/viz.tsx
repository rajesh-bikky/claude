import type { Analysis, Verdict } from "@/lib/stats";
import type { Answer, Projection } from "@/lib/types";

export const ANSWER_META: Record<Answer, { label: string; emoji: string; color: string }> = {
  need: { label: "Badly need it", emoji: "🔥", color: "var(--need)" },
  maybe: { label: "Maybe", emoji: "🤔", color: "var(--maybe)" },
  nah: { label: "Won't use it", emoji: "🤷", color: "var(--nah)" },
};

const VERDICT_META: Record<Verdict, { label: string; icon: string }> = {
  build: { label: "Build it", icon: "✓" },
  nix: { label: "Nix it", icon: "✕" },
  inconclusive: { label: "Too close to call", icon: "≈" },
  collecting: { label: "Collecting", icon: "…" },
};

export const pct = (x: number) => `${Math.round(x * 100)}%`;

export function VerdictPill({ verdict }: { verdict: Verdict }) {
  const m = VERDICT_META[verdict];
  return (
    <span className={`pill ${verdict}`}>
      <span aria-hidden>{m.icon}</span>
      {m.label}
    </span>
  );
}
export const verdictLabel = (v: Verdict) => VERDICT_META[v].label;
export const verdictIcon = (v: Verdict) => VERDICT_META[v].icon;

/** 100% stacked bar of answers, need → maybe → nah. */
export function AnswerStack({ counts, height = 14 }: { counts: Record<Answer, number>; height?: number }) {
  const n = counts.need + counts.maybe + counts.nah;
  return (
    <div
      className="stack"
      style={{ height, overflow: "visible" }}
      role="img"
      aria-label={`${counts.need} need, ${counts.maybe} maybe, ${counts.nah} won't use`}
    >
      {n > 0 &&
        (Object.keys(ANSWER_META) as Answer[]).map((a) =>
          counts[a] ? (
            <div
              key={a}
              className="tip"
              data-tip={`${ANSWER_META[a].label}: ${counts[a]} (${pct(counts[a] / n)})`}
              style={{ flex: counts[a], background: ANSWER_META[a].color, borderRadius: 4 }}
            />
          ) : null,
        )}
    </div>
  );
}

export function Legend() {
  return (
    <div className="legend">
      {(Object.keys(ANSWER_META) as Answer[]).map((a) => (
        <span key={a}>
          <i style={{ background: ANSWER_META[a].color }} />
          {ANSWER_META[a].emoji} {ANSWER_META[a].label}
        </span>
      ))}
    </div>
  );
}

/**
 * The "badly need it" rate with its 95% interval on a 0–100% track, and the
 * build bar as a vertical rule. Interval fully right of the bar = build,
 * fully left = nix, straddling = keep collecting.
 */
export function IntervalBar({ a, compact = false }: { a: Pick<Analysis, "need" | "threshold" | "n">; compact?: boolean }) {
  const h = compact ? 18 : 40;
  const x = (v: number) => `${v * 100}%`;
  const band = compact ? 6 : 10;
  const dot = compact ? 10 : 14;
  return (
    <div
      style={{ position: "relative", height: h, minWidth: compact ? 120 : 0, marginBottom: compact ? 0 : 20 }}
      role="img"
      aria-label={`Need rate ${pct(a.need.p)}, 95% interval ${pct(a.need.lo)} to ${pct(a.need.hi)}, build bar ${pct(a.threshold)}`}
    >
      <div style={{ position: "absolute", left: 0, right: 0, top: h / 2 - 1, height: 2, background: "var(--border)", borderRadius: 2 }} />
      {a.n > 0 && (
        <>
          <div
            className="tip"
            data-tip={`95% CI ${pct(a.need.lo)}–${pct(a.need.hi)}`}
            style={{ position: "absolute", left: x(a.need.lo), width: x(a.need.hi - a.need.lo), top: h / 2 - band / 2, height: band, background: "var(--need)", opacity: 0.35, borderRadius: 4 }}
          />
          <div
            className="tip"
            data-tip={`Need rate ${pct(a.need.p)}`}
            style={{ position: "absolute", left: x(a.need.p), top: h / 2 - dot / 2, width: dot, height: dot, marginLeft: -dot / 2, borderRadius: "50%", background: "var(--need)", boxShadow: "0 0 0 2px var(--surface)" }}
          />
        </>
      )}
      <div
        className="tip"
        data-tip={`Build bar ${pct(a.threshold)}`}
        style={{ position: "absolute", left: x(a.threshold), top: 0, bottom: 0, width: 2, marginLeft: -1, background: "var(--ink)" }}
      />
      {!compact && (
        <>
          <span className="small faint" style={{ position: "absolute", left: 0, bottom: -20 }}>0%</span>
          <span className="small" style={{ position: "absolute", left: x(a.threshold), bottom: -20, transform: "translateX(-50%)", fontWeight: 600 }}>
            bar {pct(a.threshold)}
          </span>
          <span className="small faint" style={{ position: "absolute", right: 0, bottom: -20 }}>100%</span>
        </>
      )}
    </div>
  );
}

const LIKELY = {
  build: { label: "Likely build", cls: "build" },
  nix: { label: "Likely nix", cls: "nix" },
  uncertain: { label: "Could go either way", cls: "inconclusive" },
} as const;

/** The agent's forecast: a range, not a result. Drawn on the same track as real results. */
export function ProjectionView({ p, bar }: { p: Projection; bar: number }) {
  const l = LIKELY[p.likely];
  return (
    <div className="grid" style={{ gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 24, fontWeight: 800 }} className="num">~{pct(p.needRate)}</span>
        <span className="small muted num">likely range {pct(p.low)}–{pct(p.high)}</span>
        <span className={`pill ${l.cls}`}>{l.label}</span>
      </div>
      <IntervalBar a={{ need: { p: p.needRate, lo: p.low, hi: p.high }, threshold: bar, n: 1 }} />
      <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
        {p.basis.map((b) => <li key={b}>{b}</li>)}
        {p.risks.map((r) => <li key={r} style={{ color: "var(--warning)" }}>Risk: {r}</li>)}
      </ul>
      <div className="small faint">
        {p.source === "claude" ? "Forecast by Claude from your history and this bit’s wording." : "Statistical prior from past answers only — it can’t read the idea itself."}
        {" "}A forecast, not a result: launch to measure.
      </div>
    </div>
  );
}
