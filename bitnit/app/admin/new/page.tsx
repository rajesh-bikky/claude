import { connection } from "next/server";
import { getStore } from "@/lib/store";
import { Nav } from "../../nav";
import { Editor, type EditorInitial } from "./editor";

export default async function NewBit({ searchParams }: PageProps<"/admin/new">) {
  await connection();
  const { from } = await searchParams;
  const store = getStore();
  const sug = typeof from === "string" ? store.suggestions.find((s) => s.id === from) : undefined;
  const goals = store.goals.map((g) => ({ id: g.id, title: g.title }));

  const initial: EditorInitial = sug
    ? {
        title: sug.title,
        problem: sug.problem,
        solution: sug.solution,
        targeting: sug.targeting,
        effortWeeks: sug.effortWeeks,
        projection: sug.projection,
        fromSuggestion: sug.id,
        goalId: sug.goalId,
      }
    : {
        title: "",
        problem: "",
        solution: "",
        targeting: { personas: [], features: [], minTenureDays: 14, minFit: 0.4 },
        effortWeeks: 2,
      };

  return (
    <div className="shell">
      <Nav />
      <div style={{ margin: "12px 0 20px" }}>
        {sug && <div className="eyebrow">From a scouted bit</div>}
        <h1 style={{ fontSize: 30, letterSpacing: "-0.02em", marginTop: 4 }}>{sug ? "Review and launch" : "New bit"}</h1>
      </div>
      <Editor initial={initial} goals={goals} />
    </div>
  );
}
