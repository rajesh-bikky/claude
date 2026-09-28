// Polls Cerebrew for ideas flagged "Spin off", and turns each one into a
// real, independent project folder — seeded with the idea and instructed to
// start with the interview-me skill before any code gets written.
//
// Run manually with `node scripts/spinoff-watcher.mjs`, or on the Windows
// scheduled task set up alongside this script.

import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";

const CEREBREW_URL = process.env.CEREBREW_URL ?? "https://cerebrew.vercel.app";
const PROJECTS_ROOT = process.env.PROJECTS_ROOT ?? "C:\\Users\\Student\\Desktop\\Claude";
const ENV_LOCAL_PATH = path.join(import.meta.dirname, "..", ".env.local");

async function readWatcherSecret() {
  const envText = await readFile(ENV_LOCAL_PATH, "utf-8");
  const match = envText.match(/^WATCHER_SECRET="?([^"\r\n]+)"?/m);
  if (!match) throw new Error(`Could not find WATCHER_SECRET in ${ENV_LOCAL_PATH}`);
  return match[1];
}

function slugify(text) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/, "") || "idea"
  );
}

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function uniqueFolder(root, slug) {
  let candidate = path.join(root, slug);
  let suffix = 2;
  // Small personal-scale loop — collisions are rare and this keeps it simple.
  while (await pathExists(candidate)) {
    candidate = path.join(root, `${slug}-${suffix}`);
    suffix += 1;
  }
  await mkdir(candidate, { recursive: true });
  return candidate;
}

function seedContent(entry) {
  const captured = new Date(entry.createdAt).toLocaleString();
  return `# Idea: ${entry.text.slice(0, 60)}${entry.text.length > 60 ? "…" : ""}

Captured from Cerebrew on ${captured}.

> ${entry.text}

Before writing any code, use the \`interview-me\` skill to refine scope and
intent with the user. Do not start building until the interview produces a
confirmed statement of intent.
`;
}

async function main() {
  const secret = await readWatcherSecret();
  const authHeader = `Bearer ${secret}`;

  const res = await fetch(`${CEREBREW_URL}/api/spinoffs`, {
    headers: { Authorization: authHeader },
  });
  if (!res.ok) {
    throw new Error(`GET /api/spinoffs failed: ${res.status} ${await res.text()}`);
  }
  const { entries } = await res.json();

  if (entries.length === 0) {
    console.log("No spin-off requests pending.");
    return;
  }

  for (const entry of entries) {
    const slug = slugify(entry.text);
    const folder = await uniqueFolder(PROJECTS_ROOT, slug);
    await writeFile(path.join(folder, "CLAUDE.md"), seedContent(entry), "utf-8");

    const patchRes = await fetch(`${CEREBREW_URL}/api/spinoffs/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ spinoffPath: folder }),
    });
    if (!patchRes.ok) {
      console.error(`Failed to mark ${entry.id} as created: ${patchRes.status}`);
      continue;
    }

    console.log(`Created ${folder} for: "${entry.text.slice(0, 60)}"`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
