"use client";

type Stat = { label: string; count: number };

export type DashboardDrilldown =
  | { kind: "label"; label: string }
  | { kind: "other"; excludeLabels: string[] }
  | { kind: "ideas" };

export function Dashboard({
  top,
  otherCount,
  total,
  ideaCount,
  loading,
  onSelect,
}: {
  top: Stat[];
  otherCount: number;
  total: number;
  ideaCount: number;
  loading: boolean;
  onSelect: (drilldown: DashboardDrilldown) => void;
}) {
  if (loading) return <p className="text-[14px] text-muted">Loading…</p>;

  if (total === 0 && ideaCount === 0) {
    return <p className="text-[14px] text-muted">Nothing outstanding — nice.</p>;
  }

  return (
    <div>
      {total > 0 && (
        <>
          <p className="mb-4 text-[13px] text-muted">
            {total} outstanding to-do{total === 1 ? "" : "s"}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {top.map((tile) => (
              <Tile key={tile.label} tile={tile} onClick={() => onSelect({ kind: "label", label: tile.label })} />
            ))}
            {otherCount > 0 && (
              <Tile
                tile={{ label: "Other", count: otherCount }}
                onClick={() => onSelect({ kind: "other", excludeLabels: top.map((t) => t.label) })}
              />
            )}
          </div>
        </>
      )}

      <p className="mb-2 mt-6 text-[12px] font-semibold uppercase tracking-wide text-muted">Ideas</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile tile={{ label: "Outstanding", count: ideaCount }} onClick={() => onSelect({ kind: "ideas" })} />
      </div>
    </div>
  );
}

function Tile({ tile, onClick }: { tile: Stat; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-hairline bg-surface-card px-4 py-5 text-center transition hover:border-hairline-strong"
    >
      <p className="font-display text-4xl text-ink">{tile.count}</p>
      <p className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-muted">{tile.label}</p>
    </button>
  );
}
