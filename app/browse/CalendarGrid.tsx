"use client";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function dateKey(year: number, month: number, day: number) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function CalendarGrid({
  year,
  month,
  counts,
  selectedDay,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}: {
  year: number;
  month: number; // 0-indexed
  counts: Record<string, number>;
  selectedDay: string | null;
  onSelectDay: (day: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = dateKey(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  );

  const cells: Array<{ day: number; key: string } | null> = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      key: dateKey(year, month, i + 1),
    })),
  ];

  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl text-ink">{monthLabel}</h2>
        <div className="flex gap-1">
          <button
            onClick={onPrevMonth}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline-strong text-ink"
          >
            ‹
          </button>
          <button
            onClick={onNextMonth}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline-strong text-ink"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="pb-1 text-[11px] font-semibold uppercase text-muted">
            {w}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} />;
          const count = counts[cell.key] ?? 0;
          const isSelected = selectedDay === cell.key;
          const isToday = cell.key === todayKey;
          return (
            <button
              key={cell.key}
              onClick={() => onSelectDay(cell.key)}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-[13px] transition ${
                isSelected
                  ? "border-ink bg-primary text-on-primary"
                  : isToday
                    ? "border-ink text-ink"
                    : "border-hairline text-ink"
              }`}
            >
              <span>{cell.day}</span>
              {count > 0 && (
                <span
                  className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                    isSelected ? "bg-on-primary" : "bg-gradient-sky"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
