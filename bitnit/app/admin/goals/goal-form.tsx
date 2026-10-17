"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type MetricOption = { key: string; label: string; description: string };

export function GoalForm({ metrics }: { metrics: MetricOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState(metrics[0]?.key ?? "");
  const [target, setTarget] = useState(60);
  const [busy, setBusy] = useState(false);
  const desc = metrics.find((m) => m.key === metric)?.description;

  return (
    <form
      className="grid"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setBusy(true);
        await fetch("/api/admin/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, metric, target: target / 100 }),
        });
        setBusy(false);
        setTitle("");
        router.refresh();
      }}
    >
      <label className="field">What should the product achieve?
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Books are closed every month" required />
      </label>
      <label className="field">Measured by
        <select className="input" value={metric} onChange={(e) => setMetric(e.target.value)}>
          {metrics.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <span className="small faint" style={{ fontWeight: 400 }}>{desc}</span>
      </label>
      <label className="field">Target
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="range" min={5} max={100} value={target} onChange={(e) => setTarget(Number(e.target.value))} style={{ flex: 1 }} />
          <strong className="num" style={{ width: 44 }}>{target}%</strong>
        </div>
      </label>
      <div style={{ display: "flex", justifyContent: "end" }}>
        <button className="btn primary" disabled={busy}>Add goal</button>
      </div>
    </form>
  );
}

export function DeleteGoal({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      className="btn"
      style={{ padding: "4px 10px" }}
      onClick={async () => {
        if (!confirm("Remove this goal? Scouted bits already drafted for it stay in the queue.")) return;
        await fetch(`/api/admin/goals/${id}`, { method: "DELETE" });
        router.refresh();
      }}
    >
      Remove
    </button>
  );
}
