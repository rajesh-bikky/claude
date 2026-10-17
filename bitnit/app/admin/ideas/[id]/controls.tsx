"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Idea } from "@/lib/types";

export function IdeaControls({ idea, suggested }: { idea: Idea; suggested: "build" | "nix" | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [threshold, setThreshold] = useState(Math.round(idea.buildThreshold * 100));

  async function patch(body: object) {
    setBusy(true);
    await fetch(`/api/admin/ideas/${idea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "end" }}>
        {idea.status !== "live" && (
          <button className="btn primary" disabled={busy} onClick={() => patch({ status: "live" })}>
            {idea.status === "draft" ? "Launch to users" : "Resume asking"}
          </button>
        )}
        {idea.status === "live" && (
          <button className="btn" disabled={busy} onClick={() => patch({ status: "paused" })}>Pause</button>
        )}
        {idea.status !== "decided" && (
          <>
            <button className={`btn${suggested === "build" ? " primary" : ""}`} disabled={busy}
              onClick={() => patch({ decide: { verdict: "build" } })}>✓ Decide: build</button>
            <button className={`btn${suggested === "nix" ? " primary" : ""}`} disabled={busy}
              onClick={() => patch({ decide: { verdict: "nix" } })}>✕ Decide: nix</button>
          </>
        )}
        <button className="btn danger" disabled={busy} onClick={async () => {
          if (!confirm(`Delete “${idea.title}” and all its responses?`)) return;
          await fetch(`/api/admin/ideas/${idea.id}`, { method: "DELETE" });
          router.push("/admin");
          router.refresh();
        }}>Delete</button>
      </div>
      <label className="small muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        Build bar
        <input className="input num" type="number" min={5} max={90} value={threshold} style={{ width: 72, padding: "5px 8px" }}
          onChange={(e) => setThreshold(Number(e.target.value))}
          onBlur={() => threshold / 100 !== idea.buildThreshold && patch({ buildThreshold: threshold / 100 })} />
        % must badly need it
      </label>
    </div>
  );
}
