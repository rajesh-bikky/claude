"use client";

type Stat = { label: string; count: number };

export function Dashboard({
  top,
  otherCount,
  total,
  loading,
}: {
  top: Stat[];
  otherCount: number;
  total: number;
  loading: boolean;
}) {
  if (loading) return <p className="text-[14px] text-muted">Loading…</p>;

  if (total === 0) {
    return <p className="text-[14px] text-muted">No outstanding to-dos — nice.</p>;
  }

  const tiles: Stat[] = [...top];
  if (otherCount > 0) tiles.push({ label: "Other", count: otherCount });

  return (
    <div>
      <p className="mb-4 text-[13px] text-muted">
        {total} outstanding to-do{total === 1 ? "" : "s"}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-xl border border-hairline bg-surface-card px-4 py-5 text-center"
          >
            <p className="font-display text-4xl text-ink">{tile.count}</p>
            <p className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-muted">
              {tile.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
