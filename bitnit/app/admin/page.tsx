import Link from "next/link";
import { connection } from "next/server";
import { analyze, type Analysis } from "@/lib/stats";
import { getStore } from "@/lib/store";
import type { Idea } from "@/lib/types";
import { Nav } from "../nav";
import { ResetButton } from "./reset-button";
import { AnswerStack, IntervalBar, Legend, VerdictPill, pct } from "./viz";

type Row = { idea: Idea; a: Analysis };

const weeks = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} eng-week${n === 1 ? "" : "s"}`;

export default async function Dashboard() {
  await connection();
  const store = getStore();
  const rows: Row[] = store.ideas.map((idea) => ({ idea, a: analyze(idea, store.responses, store.impressions) }));

  const suggested = store.suggestions.filter((s) => s.status === "pending");
  const drafts = rows.filter((r) => r.idea.status === "draft");
  const live = rows.filter((r) => r.idea.status === "live" || r.idea.status === "paused");
  const collecting = live.filter((r) => r.a.verdict === "collecting" || r.a.verdict === "inconclusive");
  const ready = live.filter((r) => r.a.verdict === "build" || r.a.verdict === "nix");
  const built = rows.filter((r) => r.idea.decision?.verdict === "build");
  const nixed = rows.filter((r) => r.idea.decision?.verdict === "nix");
  const nixPending = ready.filter((r) => r.a.verdict === "nix");

  const effort = (rs: Row[]) => rs.reduce((s, r) => s + (r.idea.effortWeeks ?? 0), 0);
  const saved = effort(nixed);
  const savable = effort(nixPending);
  const avoidedVotes = nixed.reduce((s, r) => s + r.a.counts.nah, 0);

  const stages = [
    { label: "Suggested", n: suggested.length, href: "/admin/suggested", hint: "awaiting review" },
    { label: "Draft", n: drafts.length, href: "#in-progress", hint: "not launched" },
    { label: "Collecting", n: collecting.length, href: "#in-progress", hint: "asking users" },
    { label: "Ready to call", n: ready.length, href: "#in-progress", hint: "significant" },
    { label: "Building", n: built.length, href: "#decided", hint: "validated" },
    { label: "Nixed", n: nixed.length, href: "#saved", hint: "not building" },
  ];
  const inProgress = [...ready, ...collecting, ...drafts];

  return (
    <div className="shell">
      <Nav />
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", margin: "12px 0 20px" }}>
        <div>
          <div className="eyebrow">Builder console · Ledgerly</div>
          <h1 style={{ fontSize: 30, letterSpacing: "-0.02em", marginTop: 6 }}>Your bits</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <ResetButton />
          <Link href="/admin/new" className="btn primary">+ New bit</Link>
        </div>
      </div>

      <div className="grid hero-row" style={{ marginBottom: 16 }}>
        <section className="hero">
          <div className="eyebrow" style={{ color: "inherit", opacity: 0.7 }}>Saved from building</div>
          <div className="big num">{weeks(saved)}</div>
          <div className="sub">
            across {nixed.length} nixed bit{nixed.length === 1 ? "" : "s"} — {avoidedVotes} targeted users said they wouldn’t use them.
          </div>
          {savable > 0 && (
            <div className="sub" style={{ opacity: 1, marginTop: 6 }}>
              + {weeks(savable)} more if you accept {nixPending.length === 1 ? "the pending nix" : `${nixPending.length} pending nixes`}:{" "}
              {nixPending.map((r, i) => (
                <span key={r.idea.id}>
                  {i > 0 && ", "}
                  <Link href={`/admin/ideas/${r.idea.id}`}>{r.idea.title}</Link>
                </span>
              ))}
            </div>
          )}
        </section>
        <section className="card grid" style={{ gap: 6, alignContent: "start" }}>
          <div className="eyebrow">Validated to build</div>
          <div style={{ fontSize: 30, fontWeight: 800 }} className="num">{weeks(effort(built))}</div>
          <div className="small muted">
            {built.length} bit{built.length === 1 ? "" : "s"} with proven demand
            {ready.some((r) => r.a.verdict === "build") && ` · ${ready.filter((r) => r.a.verdict === "build").length} more ready for your call`}
          </div>
          <div className="small faint">{store.responses.length} answers from {Object.keys(store.users).length} known users</div>
        </section>
      </div>

      <nav className="pipeline" aria-label="Pipeline" style={{ marginBottom: 24 }}>
        {stages.map((s) => (
          <a key={s.label} href={s.href}>
            <span className="eyebrow">{s.label}</span>
            <span className="n num">{s.n}</span>
            <span className="small faint">{s.hint}</span>
          </a>
        ))}
      </nav>

      {suggested.length > 0 && (
        <Link href="/admin/suggested" className="card" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", marginBottom: 24 }}>
          <span style={{ fontSize: 22 }} aria-hidden>✨</span>
          <span style={{ flex: 1 }}>
            <strong>{suggested.length} suggested bit{suggested.length === 1 ? "" : "s"}</strong>
            <span className="muted"> from patterns in usage and feedback — {suggested.slice(0, 3).map((s) => s.title).join(", ")}{suggested.length > 3 ? "…" : ""}</span>
          </span>
          <span className="btn">Review →</span>
        </Link>
      )}

      <h2 id="in-progress" style={{ fontSize: 18, marginBottom: 10 }}>In progress</h2>
      <div className="card table-wrap" style={{ padding: 0, marginBottom: 8 }}>
        <table>
          <thead>
            <tr>
              <th style={{ paddingLeft: 20 }}>Bit</th>
              <th>Responses</th>
              <th style={{ minWidth: 140 }}>Answers</th>
              <th style={{ minWidth: 150 }}>Need rate vs bar</th>
              <th>Effort</th>
              <th>Call</th>
            </tr>
          </thead>
          <tbody>
            {inProgress.map(({ idea, a }) => (
              <tr key={idea.id}>
                <td style={{ paddingLeft: 20 }}>
                  <Link href={`/admin/ideas/${idea.id}`} style={{ fontWeight: 600, textDecoration: "none" }}>{idea.title}</Link>
                  <div className="small faint" style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                    <span className={`pill ${idea.status}`} style={{ padding: "1px 7px" }}>{idea.status}</span>
                    {idea.fromSuggestion && <span>✨ agent-suggested</span>}
                  </div>
                </td>
                <td className="num">{a.n}<span className="faint"> / {idea.targetSample}</span></td>
                <td><AnswerStack counts={a.counts} height={10} /></td>
                <td>
                  {a.n > 0 ? (
                    <>
                      <IntervalBar a={a} compact />
                      <div className="small muted num">{pct(a.need.p)} <span className="faint">({pct(a.need.lo)}–{pct(a.need.hi)})</span></div>
                    </>
                  ) : idea.projection ? (
                    <span className="small muted">Projected ~{pct(idea.projection.needRate)}</span>
                  ) : (
                    <span className="small faint">—</span>
                  )}
                </td>
                <td className="num small">{idea.effortWeeks ? `${idea.effortWeeks} wk` : "—"}</td>
                <td>{idea.status === "draft" ? <span className="faint small">Not launched</span> : <VerdictPill verdict={a.verdict} />}</td>
              </tr>
            ))}
            {inProgress.length === 0 && (
              <tr><td colSpan={6} style={{ paddingLeft: 20 }} className="faint">Nothing in flight. Launch a bit or review a suggestion.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginBottom: 28 }}><Legend /></div>

      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <section>
          <h2 id="saved" style={{ fontSize: 18, marginBottom: 10 }}>What users saved you from building</h2>
          <div className="grid" style={{ gap: 10 }}>
            {nixed.length === 0 && <div className="card small faint">No nixed bits yet.</div>}
            {nixed.map(({ idea, a }) => {
              const quote = store.responses.find((r) => r.ideaId === idea.id && r.comment && r.answer === "nah");
              return (
                <Link key={idea.id} href={`/admin/ideas/${idea.id}`} className="card" style={{ textDecoration: "none", display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong>{idea.title}</strong>
                    <span className="pill nix">✕ {idea.effortWeeks ? `${idea.effortWeeks} wk saved` : "nixed"}</span>
                  </div>
                  <AnswerStack counts={a.counts} height={8} />
                  <div className="small muted">
                    Only {pct(a.need.p)} badly needed it (bar {pct(idea.buildThreshold)}); {pct(a.n ? a.counts.nah / a.n : 0)} wouldn’t use it · n={a.n}
                  </div>
                  {quote && <div className="small faint">“{quote.comment}”</div>}
                </Link>
              );
            })}
          </div>
        </section>
        <section>
          <h2 id="decided" style={{ fontSize: 18, marginBottom: 10 }}>Greenlit</h2>
          <div className="grid" style={{ gap: 10 }}>
            {built.length === 0 && <div className="card small faint">Nothing greenlit yet.</div>}
            {built.map(({ idea, a }) => (
              <Link key={idea.id} href={`/admin/ideas/${idea.id}`} className="card" style={{ textDecoration: "none", display: "grid", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{idea.title}</strong>
                  <span className="pill build">✓ build{idea.effortWeeks ? ` · ${idea.effortWeeks} wk` : ""}</span>
                </div>
                <AnswerStack counts={a.counts} height={8} />
                <div className="small muted">{pct(a.need.p)} badly need it (95% CI {pct(a.need.lo)}–{pct(a.need.hi)}) · n={a.n}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
