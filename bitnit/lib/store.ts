import fs from "node:fs";
import path from "node:path";
import { buildSeed } from "./seed";
import type { Store } from "./types";

// A JSON file is plenty for a prototype. Swap for a real database before
// pointing a production product at this.
const FILE = path.join(process.cwd(), "data", "store.json");

const g = globalThis as unknown as { __bitnit?: Store };

export function getStore(): Store {
  if (g.__bitnit) return g.__bitnit;
  try {
    g.__bitnit = JSON.parse(fs.readFileSync(FILE, "utf8")) as Store;
    g.__bitnit.suggestions ??= [];
    g.__bitnit.goals ??= [];
    g.__bitnit.settings ??= { maxBitsPer30d: 3 };
  } catch {
    g.__bitnit = buildSeed();
    save();
  }
  return g.__bitnit;
}

export function save() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(g.__bitnit));
  } catch {
    // Read-only filesystem (e.g. serverless): keep running in memory.
  }
}

export function resetStore() {
  g.__bitnit = buildSeed();
  save();
  return g.__bitnit;
}

export { newId } from "./id";
