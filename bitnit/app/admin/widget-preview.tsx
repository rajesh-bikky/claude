"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type PreviewPrompt = { ideaId: string; title: string; problem: string; solution: string; whyYou?: string };
type Bitnit = { preview: (el: HTMLElement, p: PreviewPrompt, o?: { accent?: string }) => () => void };

/** The real widget, rendered inline in preview mode — what users will see, pixel for pixel. */
export function WidgetPreview({ prompt, caption }: { prompt: PreviewPrompt; caption?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const key = JSON.stringify(prompt);

  useEffect(() => {
    const B = (window as unknown as { BITNIT?: Bitnit }).BITNIT;
    if (!ready || !B || !ref.current) return;
    return B.preview(ref.current, JSON.parse(key), { accent: "#4b3fd1" });
  }, [ready, key]);

  return (
    <div>
      <Script src="/bitnit.js" onReady={() => setReady(true)} />
      <div
        style={{
          background: "repeating-linear-gradient(135deg, var(--surface-2) 0 10px, var(--bg) 10px 20px)",
          borderRadius: 12,
          padding: 20,
          display: "grid",
          placeItems: "center",
          minHeight: 200,
        }}
      >
        <div ref={ref} style={{ width: "100%", maxWidth: 340 }} />
      </div>
      {caption && <p className="small faint" style={{ margin: "8px 0 0" }}>{caption}</p>}
    </div>
  );
}
