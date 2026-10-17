"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerateButton({ ai }: { ai: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  return (
    <div style={{ display: "grid", justifyItems: "end", gap: 4 }}>
      <button
        className="btn primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg("");
          const res = await fetch("/api/admin/suggestions", { method: "POST" }).then((r) => r.json());
          setBusy(false);
          setMsg(
            res.added
              ? `${res.added} new suggestion${res.added === 1 ? "" : "s"}${res.source === "rules" ? " (rules)" : ""}.`
              : res.error
                ? `Claude failed (${res.error}); no new rule-based ideas either.`
                : "No new ideas — the data hasn't changed enough since the last run.",
          );
          router.refresh();
        }}
      >
        {busy ? "Analyzing product…" : "✨ Find new bits"}
      </button>
      <span className="small faint">{msg || (ai ? "Claude reads usage, past bits and comments." : "Rules only — set ANTHROPIC_API_KEY to let Claude look.")}</span>
    </div>
  );
}

export function SuggestionActions({ id, discarded }: { id: string; discarded?: boolean }) {
  const router = useRouter();
  const set = async (status: "pending" | "discarded") => {
    await fetch(`/api/admin/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  };
  if (discarded) return <button className="btn" style={{ padding: "4px 10px" }} onClick={() => set("pending")}>Restore</button>;
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button className="btn" onClick={() => set("discarded")}>Discard</button>
      <Link className="btn primary" href={`/admin/new?from=${id}`}>Edit &amp; launch →</Link>
    </div>
  );
}
