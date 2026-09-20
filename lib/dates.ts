export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// The calendar shows entries on the day they're due, not the day they were
// captured — entries without an explicit due date fall back to their capture day.
export function effectiveDateKey(entry: { dueDate: Date | null; createdAt: Date }): string {
  return toDateKey(entry.dueDate ?? entry.createdAt);
}
