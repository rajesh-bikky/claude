import Link from "next/link";
import { connection } from "next/server";
import { METRICS, SOURCES, describeFriction, funnel } from "@/lib/analytics";
import { personaLabel } from "@/lib/catalog";
import { getStore } from "@/lib/store";
import { Nav } from "../../nav";
import { pct } from "../viz";
import { DeleteGoal, GoalForm } from "./goal-form";

export default async function Goals() {
  await connection();
  const store = getStore();

  return (
    <div className="shell">
      <Nav />
      <div style={{ margin: "12px 0 20px", maxWidth: 640 }}>
        <div className="eyebrow">What the product should do</div>
        <h1 style={{ fontSize: 30, letterSpacing: "-0.02em", marginTop: 6 }}>Goals</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          Set the outcomes you want. The Scout measures each one in your analytics, finds the step where users drop off, and
          drafts bits to fix it.
        </p>
      </div>

      <div className="grid" style={{ gap: 16 }}>
        {store.goals.map((g) => {
          const f = funnel(g.metric, store);
          if (!f) return null;
          const bits = store.suggestions.filter((s) => s.goalId === g.id && s.status === "pending").length;
          const live = store.ideas.filter((i) => i.goalId === g.id && i.status === "live").length;
          const gap = g.target - f.value;
          return (
            <section key={g.id} className="card grid" style={{ gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "start" }}>
                <div>
                  <h2 style={{ fontSize: 19 }}>◎ {g.title}</h2>
                  <div className="small muted">{f.metric.label} — {f.metric.description}</div>
                </div>
                <DeleteGoal id={g.id} />
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 30, fontWeight: 800 }} className="num">{pct(f.value)}</span>
                <span className="muted">of target {pct(g.target)}</span>
                <span className={`pill ${gap <= 0 ? "build" : "inconclusive"}`}>{gap <= 0 ? "✓ On target" : `${Math.round(gap * 100)} pts to go`}</span>
              </div>
              <div style={{ position: "relative", height: 10, background: "var(--surface-2)", borderRadius: 4 }} role="img"
                aria-label={`${pct(f.value)} of a ${pct(g.target)} target`}>
                <div style={{ width: pct(Math.min(1, f.value)), height: "100%", background: "var(--need)", borderRadius: 4 }} />
                <div style={{ position: "absolute", left: pct(g.target), top: -4, bottom: -4, width: 2, background: "var(--ink)" }} />
              </div>

              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Funnel · last 30 days</div>
                <div className="grid" style={{ gap: 6 }}>
                  {f.steps.map((st, i) => {
                    const weakest = f.friction && f.friction.stepIndex + 1 === i;
                    return (
                      <div key={st.key} style={{ display: "grid", gridTemplateColumns: "minmax(110px, 180px) 1fr 110px", gap: 10, alignItems: "center" }}>
                        <span className="small" style={{ fontWeight: weakest ? 700 : 400 }}>{st.label}</span>
                        <div style={{ height: 12, background: "var(--surface-2)", borderRadius: 4 }}>
                          <div style={{ width: pct(st.count / f.steps[0].count), height: "100%", borderRadius: 4, background: weakest ? "var(--nah)" : "var(--need)" }} />
                        </div>
                        <span className="small num muted">
                          {st.count.toLocaleString()}
                          {i > 0 && <span style={{ color: weakest ? "var(--nah)" : undefined }}> · {pct(st.rate)}</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {f.friction && (
                <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: 14, display: "grid", gap: 6 }}>
                  <div className="eyebrow">Where users get stuck</div>
                  <div>{describeFriction(f)}</div>
                  <div className="small muted">
                    By persona: {f.byPersona.map((p) => `${personaLabel(p.persona)} ${pct(p.rates[f.friction!.stepIndex])}`).join(" · ")}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                    <Link className="btn primary" href={`/admin/scout?goal=${g.id}`} style={{ padding: "5px 10px" }}>
                      {bits} scouted bit{bits === 1 ? "" : "s"} for this goal →
                    </Link>
                    {live > 0 && <span className="small muted" style={{ alignSelf: "center" }}>{live} live bit{live === 1 ? "" : "s"} working on it</span>}
                  </div>
                </div>
              )}
            </section>
          );
        })}

        <div className="grid cols-2" style={{ alignItems: "start" }}>
          <section className="card">
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Add a goal</h2>
            <GoalForm metrics={METRICS.map((m) => ({ key: m.key, label: m.label, description: m.description }))} />
          </section>
          <section className="card">
            <h2 style={{ fontSize: 16, marginBottom: 4 }}>Connected sources</h2>
            <p className="small muted" style={{ margin: "0 0 12px" }}>Goals are measured here; the Scout reads them daily.</p>
            <div className="grid" style={{ gap: 8 }}>
              {SOURCES.map((s) => (
                <div key={s.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span>{s.name} <span className="small faint">· {s.kind}</span></span>
                  {s.connected ? <span className="pill build">● Connected</span> : <span className="pill">Not built yet</span>}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
