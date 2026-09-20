export type EntryCategory = "todo" | "idea" | "thought";

export type Entry = {
  id: string;
  sessionId: string;
  text: string;
  category: EntryCategory;
  label: string | null;
  completed: boolean;
  dueDate: string | null;
  createdAt: string;
};

export const CATEGORY_META: Record<EntryCategory, { title: string; plural: string }> = {
  todo: { title: "To-do", plural: "To-dos" },
  idea: { title: "Idea", plural: "Ideas" },
  thought: { title: "Thought", plural: "Thoughts" },
};
