"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Entry } from "@/lib/types";
import { CalendarGrid } from "./CalendarGrid";
import { EntryRow } from "./EntryRow";
import { Dashboard, type DashboardDrilldown } from "./Dashboard";

type View = "overview" | "day" | "search" | "label" | "drilldown";
type OverviewTab = "calendar" | "dashboard";
type DashboardStats = {
  top: { label: string; count: number }[];
  otherCount: number;
  total: number;
  ideaCount: number;
};

export default function BrowsePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [counts, setCounts] = useState<Record<string, number>>({});

  const [overviewTab, setOverviewTab] = useState<OverviewTab>("calendar");
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    top: [],
    otherCount: 0,
    total: 0,
    ideaCount: 0,
  });
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardDrilldown, setDashboardDrilldown] = useState<DashboardDrilldown | null>(null);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [recent, setRecent] = useState<Entry[]>([]);
  const [completedEntries, setCompletedEntries] = useState<Entry[]>([]);
  const [viewEntries, setViewEntries] = useState<Entry[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const view: View = searchQuery
    ? "search"
    : selectedDay
      ? "day"
      : selectedLabel
        ? "label"
        : dashboardDrilldown
          ? "drilldown"
          : "overview";

  // Debounce search input -> searchQuery
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const refreshCounts = useCallback(() => {
    const monthParam = `${year}-${String(month + 1).padStart(2, "0")}`;
    fetch(`/api/entries?month=${monthParam}`)
      .then((r) => r.json())
      .then((data) => setCounts(data.counts ?? {}));
  }, [year, month]);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  const refreshDashboard = useCallback(() => {
    setDashboardLoading(true);
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data) =>
        setDashboardStats({
          top: data.top ?? [],
          otherCount: data.otherCount ?? 0,
          total: data.total ?? 0,
          ideaCount: data.ideaCount ?? 0,
        }),
      )
      .finally(() => setDashboardLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-in-effect, per react.dev/learn/you-might-not-need-an-effect
    if (view === "overview" && overviewTab === "dashboard") refreshDashboard();
  }, [view, overviewTab, refreshDashboard]);

  // Recent feed: open items only — completed items live in their own section.
  const refreshRecent = useCallback(() => {
    fetch("/api/entries?recent=8&completed=false")
      .then((r) => r.json())
      .then((data) => {
        setRecent(data.entries ?? []);
        setLabels(data.labels ?? []);
      });
  }, []);

  const refreshCompleted = useCallback(() => {
    fetch("/api/entries?recent=8&completed=true")
      .then((r) => r.json())
      .then((data) => setCompletedEntries(data.entries ?? []));
  }, []);

  useEffect(() => {
    refreshRecent();
    refreshCompleted();
  }, [refreshRecent, refreshCompleted]);

  // Data for the active view
  const refreshViewEntries = useCallback(() => {
    if (view === "overview") {
      setViewEntries([]);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    if (view === "search") params.set("search", searchQuery);
    if (view === "day" && selectedDay) params.set("day", selectedDay);
    if (view === "label" && selectedLabel) {
      params.set("category", "todo");
      params.set("label", selectedLabel);
    }
    if (view === "drilldown" && dashboardDrilldown) {
      params.set("completed", "false");
      if (dashboardDrilldown.kind === "label") {
        params.set("category", "todo");
        params.set("label", dashboardDrilldown.label);
      } else if (dashboardDrilldown.kind === "other") {
        params.set("category", "todo");
        if (dashboardDrilldown.excludeLabels.length > 0) {
          params.set("excludeLabels", dashboardDrilldown.excludeLabels.join(","));
        }
      } else if (dashboardDrilldown.kind === "ideas") {
        params.set("category", "idea");
      }
    }
    fetch(`/api/entries?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setViewEntries(data.entries ?? []))
      .finally(() => setLoading(false));
  }, [view, searchQuery, selectedDay, selectedLabel, dashboardDrilldown]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-in-effect, per react.dev/learn/you-might-not-need-an-effect
    refreshViewEntries();
  }, [refreshViewEntries]);

  const refreshAfterMutation = useCallback(() => {
    refreshRecent();
    refreshCompleted();
    refreshCounts();
    refreshViewEntries();
    if (overviewTab === "dashboard") refreshDashboard();
  }, [refreshRecent, refreshCompleted, refreshCounts, refreshViewEntries, overviewTab, refreshDashboard]);

  const handleToggleComplete = useCallback(
    async (entry: Entry) => {
      await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !entry.completed }),
      });
      refreshAfterMutation();
    },
    [refreshAfterMutation],
  );

  const handleDelete = useCallback(
    async (entry: Entry) => {
      await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
      refreshAfterMutation();
    },
    [refreshAfterMutation],
  );

  const handleUpdateDueDate = useCallback(
    async (entry: Entry, dueDate: string) => {
      await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate }),
      });
      refreshAfterMutation();
    },
    [refreshAfterMutation],
  );

  const handleToggleSpinoff = useCallback(
    async (entry: Entry) => {
      const next = entry.spinoffStatus === "requested" ? null : "requested";
      await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spinoffStatus: next }),
      });
      refreshAfterMutation();
    },
    [refreshAfterMutation],
  );

  const goToMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const clearFilters = () => {
    setSelectedDay(null);
    setSelectedLabel(null);
    setDashboardDrilldown(null);
    setSearchInput("");
    setSearchQuery("");
    refreshRecent();
  };

  const dayLabel = useMemo(() => {
    if (!selectedDay) return "";
    return new Date(`${selectedDay}T00:00:00`).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, [selectedDay]);

  const drilldownTitle = useMemo(() => {
    if (!dashboardDrilldown) return "";
    if (dashboardDrilldown.kind === "label") return `Outstanding: ${dashboardDrilldown.label}`;
    if (dashboardDrilldown.kind === "other") return "Outstanding: Other";
    return "Outstanding ideas";
  }, [dashboardDrilldown]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-28 pt-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink">Cerebrew</h1>
        <Link
          href="/capture"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary"
          aria-label="New recording"
        >
          +
        </Link>
      </div>

      <input
        type="search"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Search what you've captured…"
        className="mb-6 h-11 w-full rounded-md border border-hairline-strong bg-surface-card px-4 text-[15px] text-ink outline-none focus:border-2 focus:border-ink"
      />

      {view === "search" && (
        <Section title={`Search results for "${searchQuery}"`} onClear={clearFilters}>
          <EntryList
            entries={viewEntries}
            loading={loading}
            empty="No matches yet."
            onToggleComplete={handleToggleComplete}
            onDelete={handleDelete}
            onUpdateDueDate={handleUpdateDueDate}
            onToggleSpinoff={handleToggleSpinoff}
          />
        </Section>
      )}

      {view === "day" && (
        <Section title={dayLabel} onClear={clearFilters}>
          <EntryList
            entries={viewEntries}
            loading={loading}
            empty="Nothing captured this day."
            onToggleComplete={handleToggleComplete}
            onDelete={handleDelete}
            onUpdateDueDate={handleUpdateDueDate}
            onToggleSpinoff={handleToggleSpinoff}
          />
        </Section>
      )}

      {view === "label" && (
        <Section title={`To-dos: ${selectedLabel}`} onClear={clearFilters}>
          <EntryList
            entries={viewEntries}
            loading={loading}
            empty="Nothing here yet."
            onToggleComplete={handleToggleComplete}
            onDelete={handleDelete}
            onUpdateDueDate={handleUpdateDueDate}
            onToggleSpinoff={handleToggleSpinoff}
          />
        </Section>
      )}

      {view === "drilldown" && (
        <Section title={drilldownTitle} onClear={clearFilters}>
          <EntryList
            entries={viewEntries}
            loading={loading}
            empty="Nothing here."
            onToggleComplete={handleToggleComplete}
            onDelete={handleDelete}
            onUpdateDueDate={handleUpdateDueDate}
            onToggleSpinoff={handleToggleSpinoff}
          />
        </Section>
      )}

      {view === "overview" && (
        <>
          <div className="mb-6 inline-flex rounded-pill border border-hairline-strong p-1">
            <button
              onClick={() => setOverviewTab("calendar")}
              className={`rounded-pill px-4 py-1.5 text-[13px] font-medium transition ${
                overviewTab === "calendar" ? "bg-primary text-on-primary" : "text-ink"
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setOverviewTab("dashboard")}
              className={`rounded-pill px-4 py-1.5 text-[13px] font-medium transition ${
                overviewTab === "dashboard" ? "bg-primary text-on-primary" : "text-ink"
              }`}
            >
              Dashboard
            </button>
          </div>

          {overviewTab === "calendar" ? (
            <CalendarGrid
              year={year}
              month={month}
              counts={counts}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onPrevMonth={() => goToMonth(-1)}
              onNextMonth={() => goToMonth(1)}
            />
          ) : (
            <Dashboard
              top={dashboardStats.top}
              otherCount={dashboardStats.otherCount}
              total={dashboardStats.total}
              ideaCount={dashboardStats.ideaCount}
              loading={dashboardLoading}
              onSelect={setDashboardDrilldown}
            />
          )}

          {labels.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
                To-do labels
              </h3>
              <div className="flex flex-wrap gap-2">
                {labels.map((l) => (
                  <button
                    key={l}
                    onClick={() => setSelectedLabel(l)}
                    className="rounded-pill border border-hairline-strong px-3 py-1 text-[13px] text-ink"
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
              Recent
            </h3>
            <EntryList
              entries={recent}
              loading={false}
              empty="Nothing captured yet — tap + to start."
              onToggleComplete={handleToggleComplete}
              onDelete={handleDelete}
              onUpdateDueDate={handleUpdateDueDate}
              onToggleSpinoff={handleToggleSpinoff}
            />
          </div>

          {completedEntries.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
                Completed
              </h3>
              <EntryList
                entries={completedEntries}
                loading={false}
                empty=""
                onToggleComplete={handleToggleComplete}
                onDelete={handleDelete}
                onUpdateDueDate={handleUpdateDueDate}
                onToggleSpinoff={handleToggleSpinoff}
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}

function Section({
  title,
  onClear,
  children,
}: {
  title: string;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">{title}</h2>
        <button onClick={onClear} className="text-[13px] text-muted underline">
          Back
        </button>
      </div>
      {children}
    </div>
  );
}

function EntryList({
  entries,
  loading,
  empty,
  onToggleComplete,
  onDelete,
  onUpdateDueDate,
  onToggleSpinoff,
}: {
  entries: Entry[];
  loading: boolean;
  empty: string;
  onToggleComplete: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onUpdateDueDate: (entry: Entry, dueDate: string) => void;
  onToggleSpinoff: (entry: Entry) => void;
}) {
  if (loading) return <p className="text-[14px] text-muted">Loading…</p>;
  if (entries.length === 0) return <p className="text-[14px] text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {entries.map((e) => (
        <EntryRow
          key={e.id}
          entry={e}
          onToggleComplete={onToggleComplete}
          onDelete={onDelete}
          onUpdateDueDate={onUpdateDueDate}
          onToggleSpinoff={onToggleSpinoff}
        />
      ))}
    </ul>
  );
}
