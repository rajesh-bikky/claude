import { CATEGORY_META, type Entry } from "@/lib/types";

const CATEGORY_DOT: Record<Entry["category"], string> = {
  todo: "bg-gradient-sky",
  idea: "bg-gradient-peach",
  thought: "bg-gradient-lavender",
};

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dueLabel(dateKey: string) {
  const today = toDateInputValue(new Date());
  const tomorrow = toDateInputValue(new Date(Date.now() + 86400000));
  if (dateKey === today) return "Due today";
  if (dateKey === tomorrow) return "Due tomorrow";
  const date = new Date(`${dateKey}T00:00:00`);
  return `Due ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function spinoffFolderName(path: string) {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

export function EntryRow({
  entry,
  onToggleComplete,
  onDelete,
  onUpdateDueDate,
  onToggleSpinoff,
}: {
  entry: Entry;
  onToggleComplete: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onUpdateDueDate: (entry: Entry, dueDate: string) => void;
  onToggleSpinoff: (entry: Entry) => void;
}) {
  const effectiveDateKey = toDateInputValue(
    entry.dueDate ? new Date(entry.dueDate) : new Date(entry.createdAt),
  );
  const capturedAt = new Date(entry.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <li
      className={`flex items-start gap-3 rounded-lg border border-hairline bg-surface-card px-4 py-3 ${
        entry.completed ? "opacity-50" : ""
      }`}
    >
      <button
        onClick={() => onToggleComplete(entry)}
        aria-label={entry.completed ? "Mark incomplete" : "Mark complete"}
        aria-pressed={entry.completed}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
          entry.completed
            ? "border-ink bg-primary text-on-primary"
            : "border-hairline-strong text-transparent"
        }`}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`text-[15px] leading-snug text-ink ${entry.completed ? "line-through" : ""}`}
        >
          {entry.text}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${CATEGORY_DOT[entry.category]}`}
            aria-hidden
          />
          <span className="rounded-pill bg-surface-strong px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-body">
            {CATEGORY_META[entry.category].title}
          </span>
          {entry.label && (
            <span className="rounded-pill bg-surface-strong px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-body">
              {entry.label}
            </span>
          )}

          {entry.category === "todo" && (
            <span className="relative inline-flex items-center rounded-pill border border-hairline-strong px-2.5 py-0.5 text-[11px] font-medium text-ink">
              {dueLabel(effectiveDateKey)}
              <input
                type="date"
                value={effectiveDateKey}
                onChange={(e) => e.target.value && onUpdateDueDate(entry, e.target.value)}
                aria-label="Change due date"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </span>
          )}

          {entry.category === "idea" && (
            <>
              {!entry.spinoffStatus && (
                <button
                  onClick={() => onToggleSpinoff(entry)}
                  className="rounded-pill border border-hairline-strong px-2.5 py-0.5 text-[11px] font-medium text-ink"
                >
                  Spin off
                </button>
              )}
              {entry.spinoffStatus === "requested" && (
                <button
                  onClick={() => onToggleSpinoff(entry)}
                  aria-label="Cancel spin-off request"
                  className="rounded-pill bg-surface-strong px-2.5 py-0.5 text-[11px] font-medium text-body"
                >
                  Spin-off requested…
                </button>
              )}
              {entry.spinoffStatus === "created" && (
                <span
                  title={entry.spinoffPath ?? undefined}
                  className="rounded-pill bg-surface-strong px-2.5 py-0.5 text-[11px] font-medium text-body"
                >
                  Project ready{entry.spinoffPath ? `: ${spinoffFolderName(entry.spinoffPath)}` : ""}
                </span>
              )}
            </>
          )}

          <span className="text-[12px] text-muted">captured {capturedAt}</span>
        </div>
      </div>

      <button
        onClick={() => onDelete(entry)}
        aria-label="Delete"
        className="shrink-0 rounded-full p-1.5 text-muted hover:text-error"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.7 12.1a1 1 0 0 1-1 .9H8.7a1 1 0 0 1-1-.9L7 7h10Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </li>
  );
}
