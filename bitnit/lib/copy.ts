// Pure copy rules, safe to import in the browser.

export type Copy = { title: string; problem: string; solution: string };
export const COPY_LIMITS = { title: 7, problem: 22, solution: 22 };

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Wording problems that bias answers or hurt response rate. Cheap enough to run on every keystroke. */
export function lintCopy(c: Copy): string[] {
  const out: string[] = [];
  (Object.keys(COPY_LIMITS) as (keyof Copy)[]).forEach((k) => {
    const n = words(c[k]);
    if (n > COPY_LIMITS[k]) out.push(`${k === "title" ? "Title" : k === "problem" ? "“What it solves”" : "“How it solves it”"} is ${n} words — aim for ${COPY_LIMITS[k]} or fewer.`);
  });
  const all = `${c.title} ${c.problem} ${c.solution}`;
  const leading = all.match(/\b(amazing|revolutionary|game[- ]chang\w*|effortless\w*|seamless\w*|powerful|best[- ]in[- ]class|you'?ll love|magic\w*|incredibl\w*)\b/gi);
  if (leading) out.push(`Leading words (${[...new Set(leading.map((w) => w.toLowerCase()))].join(", ")}) nudge people toward “need it” and inflate the result.`);
  if (/\?/.test(c.problem + c.solution)) out.push("Avoid questions inside the description — the answer buttons are the question.");
  return out;
}

