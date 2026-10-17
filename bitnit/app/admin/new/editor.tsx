"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FEATURES, PERSONAS, personaLabel } from "@/lib/catalog";
import { COPY_LIMITS, lintCopy, type Copy } from "@/lib/copy";
import type { Projection, Targeting } from "@/lib/types";
import { ProjectionView } from "../viz";
import { WidgetPreview } from "../widget-preview";

export type EditorInitial = Copy & {
  targeting: Targeting;
  effortWeeks: number;
  projection?: Projection;
  fromSuggestion?: string;
  goalId?: string;
};

type Audience = {
  total: number;
  eligible: number;
  avgFit: number;
  byPersona: [string, number][];
  sample: { name: string; persona: string; fit: number; whyYou: string } | null;
};
type Tightened = Copy & { notes: string[]; source: "claude" | "rules"; error?: string };

const FIELD_LABEL: Record<keyof Copy, string> = { title: "What is the idea?", problem: "What does it solve?", solution: "How does it solve it?" };
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export function Editor({ initial, goals }: { initial: EditorInitial; goals: { id: string; title: string }[] }) {
  const router = useRouter();
  const [copy, setCopy] = useState<Copy>({ title: initial.title, problem: initial.problem, solution: initial.solution });
  const [personas, setPersonas] = useState<string[]>(initial.targeting.personas);
  const [features, setFeatures] = useState<Record<string, number>>(
    Object.fromEntries(initial.targeting.features.map((f) => [f.feature, f.minUses])),
  );
  const [minTenureDays, setTenure] = useState(initial.targeting.minTenureDays);
  const [minFit, setMinFit] = useState(initial.targeting.minFit);
  const [threshold, setThreshold] = useState(35);
  const [targetSample, setTargetSample] = useState(100);
  const [effortWeeks, setEffort] = useState(initial.effortWeeks);
  const [aud, setAud] = useState<Audience | null>(null);
  const [tight, setTight] = useState<Tightened | null>(null);
  const [tightening, setTightening] = useState(false);
  const [projection, setProjection] = useState<Projection | null>(initial.projection ?? null);
  const [projecting, setProjecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [goalId, setGoalId] = useState(initial.goalId ?? "");

  const targeting: Targeting = {
    personas,
    features: Object.entries(features).map(([feature, minUses]) => ({ feature, minUses })),
    minTenureDays,
    minFit,
  };
  const tKey = JSON.stringify(targeting);

  useEffect(() => {
    const ctl = new AbortController();
    const id = setTimeout(() => {
      fetch("/api/admin/audience", { method: "POST", body: tKey, signal: ctl.signal })
        .then((r) => r.json())
        .then(setAud)
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(id);
      ctl.abort();
    };
  }, [tKey]);

  // A projection describes one specific wording + audience; editing either makes it stale.
  const [projKey, setProjKey] = useState(initial.projection ? JSON.stringify([copy, tKey]) : "");
  const stale = projection !== null && projKey !== JSON.stringify([copy, tKey]);

  const lint = lintCopy(copy);
  const valid = copy.title.trim() && copy.problem.trim() && copy.solution.trim();
  const toggle = (list: string[], k: string) => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);

  async function tighten() {
    setTightening(true);
    const res = await fetch("/api/admin/ai/tighten", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(copy) });
    setTight(await res.json());
    setTightening(false);
  }

  async function project() {
    setProjecting(true);
    const res = await fetch("/api/admin/ai/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...copy, targeting, buildThreshold: threshold / 100 }),
    });
    setProjection(await res.json());
    setProjKey(JSON.stringify([copy, tKey]));
    setProjecting(false);
  }

  async function submit(status: "draft" | "live") {
    setSaving(true);
    const res = await fetch("/api/admin/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...copy,
        status,
        targeting,
        buildThreshold: threshold / 100,
        targetSample,
        effortWeeks,
        projection: projection && !stale ? projection : undefined,
        fromSuggestion: initial.fromSuggestion,
        goalId,
      }),
    });
    const idea = await res.json();
    router.push(`/admin/ideas/${idea.id}`);
    router.refresh();
  }

  return (
    <div className="grid cols-2" style={{ alignItems: "start" }}>
      <div className="grid">
        <section className="card grid">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div className="eyebrow">The question</div>
            <button className="btn" style={{ padding: "5px 10px" }} disabled={!valid || tightening} onClick={tighten}>
              {tightening ? "Tightening…" : "✨ Tighten with AI"}
            </button>
          </div>
          {(Object.keys(FIELD_LABEL) as (keyof Copy)[]).map((k) => {
            const n = wordCount(copy[k]);
            const over = n > COPY_LIMITS[k];
            const Input = k === "title" ? "input" : "textarea";
            return (
              <label key={k} className="field">
                <span style={{ display: "flex", justifyContent: "space-between" }}>
                  {FIELD_LABEL[k]}
                  <span className="num" style={{ fontWeight: 400, color: over ? "var(--warning)" : "var(--ink-3)" }}>
                    {n}/{COPY_LIMITS[k]} words
                  </span>
                </span>
                <Input className="input" value={copy[k]} onChange={(e) => setCopy({ ...copy, [k]: e.target.value })} />
              </label>
            );
          })}
          {lint.length > 0 && (
            <ul className="small" style={{ margin: 0, paddingLeft: 18, color: "var(--warning)" }}>
              {lint.map((l) => <li key={l}>{l}</li>)}
            </ul>
          )}
        </section>

        {tight && (
          <section className="card grid" style={{ borderColor: "var(--need)" }} aria-live="polite">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div className="eyebrow">Suggested wording {tight.source === "rules" && "· rules only"}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn" style={{ padding: "5px 10px" }} onClick={() => setTight(null)}>Keep mine</button>
                <button className="btn primary" style={{ padding: "5px 10px" }}
                  onClick={() => { setCopy({ title: tight.title, problem: tight.problem, solution: tight.solution }); setTight(null); }}>
                  Use all
                </button>
              </div>
            </div>
            {(Object.keys(FIELD_LABEL) as (keyof Copy)[]).map((k) =>
              tight[k] === copy[k] ? null : (
                <div key={k} style={{ display: "grid", gap: 4 }}>
                  <div className="small muted">{FIELD_LABEL[k]}</div>
                  <div className="small" style={{ textDecoration: "line-through", color: "var(--ink-3)" }}>{copy[k]}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "start" }}>
                    <div style={{ flex: 1 }}>{tight[k]}</div>
                    <button className="btn" style={{ padding: "3px 8px", fontSize: 12 }} onClick={() => setCopy({ ...copy, [k]: tight[k] })}>Use</button>
                  </div>
                </div>
              ),
            )}
            {(Object.keys(FIELD_LABEL) as (keyof Copy)[]).every((k) => tight[k] === copy[k]) && (
              <div className="small">Already tight — no changes suggested.</div>
            )}
            {tight.notes.length > 0 && (
              <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
                {tight.notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            )}
          </section>
        )}

        <section className="card grid">
          <div className="eyebrow">Who should be asked</div>
          <div className="field">Personas <span className="faint" style={{ fontWeight: 400 }}>(none selected = everyone)</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(PERSONAS).map(([k, l]) => (
                <button key={k} type="button" className={`btn${personas.includes(k) ? " primary" : ""}`} style={{ padding: "5px 10px" }}
                  aria-pressed={personas.includes(k)} onClick={() => setPersonas(toggle(personas, k))}>{l}</button>
              ))}
            </div>
          </div>
          <div className="field">Must already use (any of)
            <div className="grid" style={{ gap: 6 }}>
              {Object.entries(FEATURES).map(([k, l]) => {
                const on = k in features;
                return (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 400 }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
                      <input type="checkbox" checked={on} onChange={() => {
                        const next = { ...features };
                        if (on) delete next[k];
                        else next[k] = 5;
                        setFeatures(next);
                      }} />
                      {l}
                    </label>
                    {on && (
                      <span className="small muted">≥ <input className="input num" type="number" min={1} value={features[k]} style={{ width: 64, padding: "4px 6px" }}
                        onChange={(e) => setFeatures({ ...features, [k]: Number(e.target.value) })} /> uses/mo</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid cols-2">
            <label className="field">Min tenure (days)
              <input className="input num" type="number" min={0} value={minTenureDays} onChange={(e) => setTenure(Number(e.target.value))} />
            </label>
            <label className="field">Min fit score
              <input className="input num" type="number" min={0} max={1} step={0.05} value={minFit} onChange={(e) => setMinFit(Number(e.target.value))} />
            </label>
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }} aria-live="polite">
            {aud ? (
              <>
                <strong className="num">{aud.eligible}</strong>
                <span className="small muted"> of {aud.total} users qualify · avg fit {aud.avgFit.toFixed(2)}</span>
                <div className="small faint">{aud.byPersona.map(([p, n]) => `${personaLabel(p)} ${n}`).join(" · ") || "Nobody matches yet."}</div>
                {aud.eligible < targetSample && (
                  <p className="small" style={{ color: "var(--warning)", margin: "6px 0 0" }}>⚠ Not enough qualifying users to reach your target sample.</p>
                )}
              </>
            ) : (
              <span className="small faint">Calculating audience…</span>
            )}
          </div>
        </section>

        <section className="card grid">
          <div className="eyebrow">Decision rule</div>
          <label className="field">Build bar — share who must “badly need it today”
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="range" min={5} max={80} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} style={{ flex: 1 }} />
              <strong className="num" style={{ width: 44 }}>{threshold}%</strong>
            </div>
          </label>
          {goals.length > 0 && (
            <label className="field">Moves which goal?
              <select className="input" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                <option value="">None</option>
                {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </label>
          )}
          <div className="grid cols-2">
            <label className="field">Target sample size
              <input className="input num" type="number" min={10} value={targetSample} onChange={(e) => setTargetSample(Number(e.target.value))} />
            </label>
            <label className="field">Build effort (eng-weeks)
              <input className="input num" type="number" min={0} step={0.5} value={effortWeeks} onChange={(e) => setEffort(Number(e.target.value))} />
            </label>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            BITNIT calls it as soon as the 95% interval clears or misses the bar. Effort is what a “nix” saves you on the dashboard.
          </p>
        </section>
      </div>

      <div className="grid sticky-col">
        <section className="card">
          <div className="eyebrow" style={{ marginBottom: 10 }}>Preview · what users see</div>
          <WidgetPreview
            prompt={{
              ideaId: "preview",
              title: copy.title || "Your idea's title",
              problem: copy.problem || "What it solves, in the user's words.",
              solution: copy.solution || "How it solves it, in a sentence.",
              whyYou: aud?.sample?.whyYou,
            }}
            caption={aud?.sample ? `Shown as ${aud.sample.name} (${personaLabel(aud.sample.persona)}, fit ${aud.sample.fit.toFixed(2)}) — your best-fit user. Click through it; nothing is recorded.` : "Click through it; nothing is recorded."}
          />
        </section>

        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div className="eyebrow">Agent’s projection</div>
            <button className="btn" style={{ padding: "5px 10px" }} disabled={!valid || projecting} onClick={project}>
              {projecting ? "Projecting…" : projection ? "Re-project" : "Project outcome"}
            </button>
          </div>
          {projection ? (
            <div style={{ opacity: stale ? 0.5 : 1 }}>
              {stale && <p className="small" style={{ color: "var(--warning)", margin: "0 0 8px" }}>Wording or audience changed since this projection — re-project.</p>}
              <ProjectionView p={projection} bar={threshold / 100} />
            </div>
          ) : (
            <p className="small faint" style={{ margin: 0 }}>Forecast how this audience will answer, based on how they answered past bits.</p>
          )}
        </section>

        <div style={{ display: "flex", gap: 8, justifyContent: "end" }}>
          <button className="btn" disabled={!valid || saving} onClick={() => submit("draft")}>Save draft</button>
          <button className="btn primary" disabled={!valid || saving} onClick={() => submit("live")}>Launch to users</button>
        </div>
      </div>
    </div>
  );
}
