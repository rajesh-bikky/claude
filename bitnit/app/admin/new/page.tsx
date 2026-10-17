"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FEATURES, PERSONAS, personaLabel } from "@/lib/catalog";
import type { Targeting } from "@/lib/types";
import { Nav } from "../../nav";

type Audience = { total: number; eligible: number; avgFit: number; byPersona: [string, number][] };

export default function NewIdea() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [solution, setSolution] = useState("");
  const [personas, setPersonas] = useState<string[]>([]);
  const [features, setFeatures] = useState<Record<string, number>>({});
  const [minTenureDays, setTenure] = useState(14);
  const [minFit, setMinFit] = useState(0.4);
  const [threshold, setThreshold] = useState(35);
  const [targetSample, setTargetSample] = useState(100);
  const [aud, setAud] = useState<Audience | null>(null);
  const [saving, setSaving] = useState(false);

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

  const toggle = (list: string[], k: string) => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);
  const valid = title.trim() && problem.trim() && solution.trim();

  async function submit(status: "draft" | "live") {
    setSaving(true);
    const res = await fetch("/api/admin/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, problem, solution, status, targeting, buildThreshold: threshold / 100, targetSample }),
    });
    const idea = await res.json();
    router.push(`/admin/ideas/${idea.id}`);
  }

  return (
    <div className="shell">
      <Nav />
      <h1 style={{ fontSize: 30, letterSpacing: "-0.02em", margin: "12px 0 20px" }}>New idea</h1>
      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="grid">
          <section className="card grid">
            <div className="eyebrow">The question</div>
            <label className="field">What is the idea?
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Recurring invoices" />
            </label>
            <label className="field">What does it solve?
              <textarea className="input" value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="The pain, in the user's words." />
            </label>
            <label className="field">How does it solve it?
              <textarea className="input" value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="What the feature does, in one or two sentences." />
            </label>
          </section>

          <section className="card grid">
            <div className="eyebrow">Decision rule</div>
            <label className="field">Build bar — share who must “badly need it today”
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="range" min={5} max={80} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} style={{ flex: 1 }} />
                <strong className="num" style={{ width: 44 }}>{threshold}%</strong>
              </div>
            </label>
            <label className="field">Target sample size
              <input className="input num" type="number" min={10} value={targetSample} onChange={(e) => setTargetSample(Number(e.target.value))} />
            </label>
            <p className="small muted" style={{ margin: 0 }}>
              BITNIT calls it as soon as the 95% interval clears or misses the bar — the target is a ceiling, not a requirement.
            </p>
          </section>
        </div>

        <div className="grid">
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
          </section>

          <section className="card" aria-live="polite">
            <div className="eyebrow">Reachable audience</div>
            {aud ? (
              <>
                <div style={{ fontSize: 30, fontWeight: 800 }} className="num">
                  {aud.eligible} <span className="small muted" style={{ fontWeight: 500 }}>of {aud.total} users · avg fit {aud.avgFit.toFixed(2)}</span>
                </div>
                <div className="small muted">{aud.byPersona.map(([p, n]) => `${personaLabel(p)} ${n}`).join(" · ") || "Nobody matches yet."}</div>
                {aud.eligible < targetSample && (
                  <p className="small" style={{ color: "var(--warning)", margin: "8px 0 0" }}>⚠ Not enough qualifying users to reach your target sample.</p>
                )}
              </>
            ) : (
              <div className="small faint">Calculating…</div>
            )}
          </section>

          <div style={{ display: "flex", gap: 8, justifyContent: "end" }}>
            <button className="btn" disabled={!valid || saving} onClick={() => submit("draft")}>Save draft</button>
            <button className="btn primary" disabled={!valid || saving} onClick={() => submit("live")}>Launch to users</button>
          </div>
        </div>
      </div>
    </div>
  );
}
