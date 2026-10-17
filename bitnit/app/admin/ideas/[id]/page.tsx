import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { featureLabel, personaLabel } from "@/lib/catalog";
import { projectionVsActual } from "@/lib/agent";
import { analyze } from "@/lib/stats";
import { getStore } from "@/lib/store";
import { audience } from "@/lib/targeting";
import { Nav } from "../../../nav";
import { ANSWER_META, AnswerStack, IntervalBar, Legend, ProjectionView, pct, verdictIcon, verdictLabel } from "../../viz";
import { WidgetPreview } from "../../widget-preview";
import { IdeaControls } from "./controls";

const fmtP = (p: number) => (p < 0.001 ? "< 0.001" : p.toFixed(3));

export default async function IdeaPage({ params }: PageProps<"/admin/ideas/[id]">) {
  await connection();
  const { id } = await params;
  const store = getStore();
  const idea = store.ideas.find((i) => i.id === id);
  if (!idea) notFound();

  const a = analyze(idea, store.responses, store.impressions);
  const aud = audience(idea.targeting, Object.values(store.users));
  const comments = store.responses
    .filter((r) => r.ideaId === idea.id && r.comment)
    .sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  const t = idea.targeting;
  const pva = projectionVsActual(idea, store);

  return (
    <div className="shell">
      <Nav />
      <Link href="/admin" className="small muted" style={{ textDecoration: "none" }}>← Dashboard</Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, flexWrap: "wrap", margin: "10px 0 20px" }}>
        <div style={{ maxWidth: 640 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <span className={`pill ${idea.status}`}>{idea.status}</span>
            {idea.decision && <span className={`pill ${idea.decision.verdict}`}>Decided: {idea.decision.verdict}</span>}
          </div>
          <h1 style={{ fontSize: 30, letterSpacing: "-0.02em" }}>{idea.title}</h1>
        </div>
        <IdeaControls idea={idea} suggested={a.verdict === "build" || a.verdict === "nix" ? a.verdict : null} />
      </div>

      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="grid">
          <section className={`verdict ${a.verdict}`} aria-live="polite">
            <div className="eyebrow">BITNIT recommends</div>
            <div className="big"><span aria-hidden>{verdictIcon(a.verdict)}</span>{verdictLabel(a.verdict)}</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
              {a.narrative.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </section>

          <section className="card">
            <div className="eyebrow" style={{ marginBottom: 4 }}>“Badly need it today” rate · 95% interval</div>
            <div style={{ fontSize: 32, fontWeight: 800 }} className="num">
              {a.n ? pct(a.need.p) : "—"}
              {a.n > 0 && <span className="muted" style={{ fontSize: 16, fontWeight: 500 }}> ({pct(a.need.lo)}–{pct(a.need.hi)})</span>}
            </div>
            <div style={{ margin: "14px 0 6px" }}><IntervalBar a={a} /></div>
            <p className="small muted" style={{ margin: 0 }}>
              Build when the whole interval clears the bar; nix when it sits entirely under it.
            </p>
          </section>

          <section className="grid cols-2">
            {[
              ["Responses", `${a.n}`, `target ${idea.targetSample}`],
              ["Response rate", a.impressions ? pct(a.responseRate) : "—", `${a.impressions} shown · ${a.dismissals} dismissed`],
              ["p-value vs bar", a.n ? fmtP(a.pValue) : "—", "one-sided, H₀: rate = bar"],
              ["Fit-weighted need", a.n ? pct(a.fitWeightedNeed) : "—", "best-fit users count more"],
            ].map(([l, v, s]) => (
              <div key={l} className="card">
                <div className="eyebrow">{l}</div>
                <div style={{ fontSize: 24, fontWeight: 800 }} className="num">{v}</div>
                <div className="small faint">{s}</div>
              </div>
            ))}
          </section>

          <section className="card">
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Answers by persona</h2>
            <div className="grid" style={{ gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 56px", gap: 12, alignItems: "center" }}>
                <strong className="small">Everyone</strong>
                <AnswerStack counts={a.counts} />
                <span className="small num muted">n={a.n}</span>
              </div>
              {a.personas.map((p) => (
                <div key={p.persona} style={{ display: "grid", gridTemplateColumns: "140px 1fr 56px", gap: 12, alignItems: "center" }}>
                  <span className="small">{personaLabel(p.persona)}</span>
                  <AnswerStack counts={p} />
                  <span className="small num muted">n={p.n}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}><Legend /></div>
            {a.personaChi && (
              <p className="small muted" style={{ margin: "12px 0 0" }}>
                χ² test of independence: χ²({a.personaChi.df}) = {a.personaChi.chi2.toFixed(1)}, p = {fmtP(a.personaChi.p)}
                {a.personaChi.p < 0.05 ? " — answers depend on persona." : " — no significant difference between personas."}
              </p>
            )}
            <details style={{ marginTop: 12 }}>
              <summary className="small" style={{ cursor: "pointer" }}>Table view</summary>
              <div className="table-wrap">
                <table style={{ marginTop: 8 }}>
                  <thead>
                    <tr><th>Persona</th>{Object.values(ANSWER_META).map((m) => <th key={m.label}>{m.emoji} {m.label}</th>)}<th>n</th></tr>
                  </thead>
                  <tbody>
                    {a.personas.map((p) => (
                      <tr key={p.persona}>
                        <td>{personaLabel(p.persona)}</td>
                        <td className="num">{p.need}</td><td className="num">{p.maybe}</td><td className="num">{p.nah}</td>
                        <td className="num">{p.n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          {a.core && a.rest && (
            <section className="card">
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>Best-fit users vs the rest</h2>
              <div className="grid cols-2">
                {[[`Best-fit half (fit ≥ ${a.core.minFit.toFixed(2)})`, a.core], ["Less-fit half", a.rest]].map(([l, s]) => {
                  const seg = s as { n: number; need: number };
                  return (
                    <div key={l as string}>
                      <div className="small muted">{l as string} · n={seg.n}</div>
                      <div style={{ fontSize: 24, fontWeight: 800 }} className="num">{pct(seg.need)}</div>
                      <div className="small faint">badly need it</div>
                    </div>
                  );
                })}
              </div>
              {a.coreVsRestP !== null && (
                <p className="small muted" style={{ margin: "12px 0 0" }}>
                  Two-proportion z-test: p = {fmtP(a.coreVsRestP)}
                  {a.coreVsRestP < 0.05 ? " — a real difference." : " — not a significant difference."}
                </p>
              )}
            </section>
          )}
        </div>

        <div className="grid">
          <section className="card">
            <div className="eyebrow" style={{ marginBottom: 10 }}>Preview · what targeted users see</div>
            <WidgetPreview
              prompt={{ ideaId: idea.id, title: idea.title, problem: idea.problem, solution: idea.solution, whyYou: aud.sample?.whyYou }}
              caption={aud.sample ? `Shown as ${aud.sample.name}, your best-fit user (fit ${aud.sample.fit.toFixed(2)}). Nothing is recorded.` : "Nothing is recorded."}
            />
          </section>

          {idea.projection && (
            <section className="card">
              <div className="eyebrow" style={{ marginBottom: 8 }}>Projected at launch{pva ? " vs actual" : ""}</div>
              {pva && (
                <p className="small" style={{ margin: "0 0 10px", color: pva.inside ? "var(--good)" : "var(--warning)" }}>
                  {pva.inside ? "✓" : "⚠"} Actual {pct(pva.actual)} landed {pva.inside ? "inside" : "outside"} the projected range
                  {pva.inside ? "." : " — the agent's prior for this audience was off; worth a look at why."}
                </p>
              )}
              <ProjectionView p={idea.projection} bar={idea.buildThreshold} />
            </section>
          )}

          <section className="card">
            <h2 style={{ fontSize: 16, marginBottom: 10 }}>Who gets asked</h2>
            <dl className="small" style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px" }}>
              <dt className="muted">Personas</dt>
              <dd style={{ margin: 0 }}>{t.personas.length ? t.personas.map(personaLabel).join(", ") : "Everyone"}</dd>
              <dt className="muted">Feature usage</dt>
              <dd style={{ margin: 0 }}>
                {t.features.length
                  ? t.features.map((f) => `${featureLabel(f.feature)} ≥ ${f.minUses}×/mo`).join(" or ")
                  : "No requirement"}
              </dd>
              <dt className="muted">Tenure</dt>
              <dd style={{ margin: 0 }}>≥ {t.minTenureDays} days</dd>
              <dt className="muted">Min fit score</dt>
              <dd style={{ margin: 0 }}>{t.minFit.toFixed(2)}</dd>
              <dt className="muted">Build effort</dt>
              <dd style={{ margin: 0 }}>{idea.effortWeeks ? `${idea.effortWeeks} eng-weeks` : "Not estimated"}</dd>
            </dl>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 22, fontWeight: 800 }} className="num">
                {aud.eligible} <span className="small muted" style={{ fontWeight: 500 }}>of {aud.total} users qualify · avg fit {aud.avgFit.toFixed(2)}</span>
              </div>
              {aud.eligible < idea.targetSample && (
                <p className="small" style={{ color: "var(--warning)", margin: "6px 0 0" }}>
                  ⚠ Fewer qualifying users than your target sample — loosen the targeting or lower the target.
                </p>
              )}
            </div>
          </section>

          <section className="card">
            <h2 style={{ fontSize: 16, marginBottom: 10 }}>In their words <span className="faint small">({comments.length})</span></h2>
            {comments.length === 0 && <p className="small faint" style={{ margin: 0 }}>No comments yet.</p>}
            <div className="grid" style={{ gap: 10 }}>
              {comments.slice(0, 12).map((c) => (
                <figure key={c.id} style={{ margin: 0, paddingLeft: 12, borderLeft: `3px solid ${ANSWER_META[c.answer].color}` }}>
                  <blockquote style={{ margin: 0 }}>“{c.comment}”</blockquote>
                  <figcaption className="small faint">
                    {ANSWER_META[c.answer].emoji} {ANSWER_META[c.answer].label} · {personaLabel(c.persona)} · fit {c.fit.toFixed(2)}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
