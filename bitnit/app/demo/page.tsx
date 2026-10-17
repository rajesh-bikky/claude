"use client";

import Script from "next/script";
import { useCallback, useEffect, useState } from "react";
import { FEATURES, personaLabel } from "@/lib/catalog";
import { DEMO_USERS } from "@/lib/demo-users";

type Prompt = { title: string; fit: number } | null;
type Bitnit = {
  init: (o: {
    user: unknown;
    accent?: string;
    onDecide?: (p: Prompt) => void;
    onAnswer?: (a: { answer: string }) => void;
  }) => Promise<Prompt>;
  destroy: () => void;
};

const INVOICES = [
  ["INV-1042", "Northwind Studio", "$4,200.00", "overdue", "12 days late"],
  ["INV-1041", "Bluebell Bakery", "$860.00", "sent", "Due Oct 24"],
  ["INV-1040", "Kite & Co", "$2,315.50", "paid", "Paid Oct 11"],
  ["INV-1039", "Harbor Legal", "$1,980.00", "overdue", "5 days late"],
  ["INV-1038", "Oak Street Dental", "$640.00", "paid", "Paid Oct 6"],
];

export default function Demo() {
  const [userId, setUserId] = useState(DEMO_USERS[0].id);
  const [ready, setReady] = useState(false);
  const [log, setLog] = useState("BITNIT is loading…");
  const user = DEMO_USERS.find((u) => u.id === userId)!;

  const run = useCallback(() => {
    const B = (window as unknown as { BITNIT?: Bitnit }).BITNIT;
    if (!B) return;
    setLog(`BITNIT is scoring ${user.name} against live ideas…`);
    B.init({
      user,
      accent: "#4b3fd1",
      onDecide: (p) =>
        setLog(
          p
            ? `BITNIT → asking ${user.name.split(" ")[0]} about “${p.title}” (fit ${p.fit.toFixed(2)})`
            : `BITNIT stayed quiet — no unanswered live idea fits ${user.name}.`,
        ),
      onAnswer: ({ answer }) => setLog(`BITNIT ← ${user.name.split(" ")[0]} answered “${answer}”. Reload as them to get the next idea.`),
    });
  }, [user]);

  useEffect(() => {
    if (ready) run();
    return () => (window as unknown as { BITNIT?: Bitnit }).BITNIT?.destroy();
  }, [ready, run]);

  return (
    <>
      <Script src="/bitnit.js" onReady={() => setReady(true)} />
      <div className="demo-bar">
        <strong>Demo</strong>
        <label>
          Signed in as{" "}
          <select value={userId} onChange={(e) => setUserId(e.target.value)} aria-label="Demo user">
            {DEMO_USERS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {personaLabel(u.persona)}
              </option>
            ))}
          </select>
        </label>
        <button onClick={run}>Ask again</button>
        <span className="agent-log" role="status">{log}</span>
        <span style={{ flex: 1 }} />
        <a href="/admin">Builder console →</a>
      </div>

      <div className="ledgerly">
        <aside>
          <div className="logo"><span>L</span>Ledgerly</div>
          {Object.entries(FEATURES).map(([k, label], i) => (
            <a key={k} href="#" className={i === 0 ? "on" : ""} onClick={(e) => e.preventDefault()}>
              {label}
              <em>{user.featureUsage[k] ?? 0}×</em>
            </a>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, padding: "10px", lineHeight: 1.5 }}>
            {user.name}
            <br />
            <span style={{ opacity: 0.6 }}>
              {user.plan} · {user.tenureDays} days
            </span>
          </div>
        </aside>

        <main>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: 24 }}>Invoices</h1>
              <div style={{ color: "#6b6a85", fontSize: 14 }}>Good afternoon, {user.name.split(" ")[0]}.</div>
            </div>
            <button className="lbtn">+ New invoice</button>
          </div>

          <div className="grid cols-3" style={{ marginBottom: 16 }}>
            {[
              ["Outstanding", "$9,355.50", "4 invoices"],
              ["Overdue", "$6,180.00", "2 invoices"],
              ["Paid this month", "$12,940.00", "+18% vs Sept"],
            ].map(([l, v, s]) => (
              <div key={l} className="lcard">
                <div style={{ color: "#6b6a85", fontSize: 13 }}>{l}</div>
                <div className="kpi num">{v}</div>
                <div style={{ color: "#6b6a85", fontSize: 12 }}>{s}</div>
              </div>
            ))}
          </div>

          <div className="lcard table-wrap">
            <table>
              <thead>
                <tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {INVOICES.map(([id, client, amt, st, note]) => (
                  <tr key={id}>
                    <td style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{id}</td>
                    <td>{client}</td>
                    <td className="num">{amt}</td>
                    <td><span className={`st ${st}`}>{st}</span></td>
                    <td style={{ color: "#6b6a85", fontSize: 13 }}>{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ color: "#8a89a3", fontSize: 12, marginTop: 16 }}>
            Ledgerly is a fictional product. The sidebar counts are this user&apos;s feature usage over the last 30 days —
            exactly what Ledgerly passes to <code>BITNIT.init()</code>.
          </p>
        </main>
      </div>
    </>
  );
}
