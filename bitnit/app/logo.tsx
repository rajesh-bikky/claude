/**
 * BITNIT mark: a taijitu — build and nix as two halves of one decision —
 * with a B and an N as its eyes. Colours follow the theme tokens.
 */
export function Logo({ size = 28, title }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <circle cx="100" cy="100" r="90" fill="var(--surface)" />
      <path d="M100 10 A90 90 0 0 0 100 190 A45 45 0 0 1 100 100 A45 45 0 0 0 100 10 Z" fill="var(--ink)" />
      <path
        d="M88 37 V73 M88 37 H101 A9 9 0 0 1 101 55 H88 M88 55 H103 A9 9 0 0 1 103 73 H88"
        fill="none" stroke="var(--surface)" strokeWidth={size < 40 ? 8 : 6} strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M86 163 V127 L114 163 V127"
        fill="none" stroke="var(--ink)" strokeWidth={size < 40 ? 8 : 6} strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="100" cy="100" r="90" fill="none" stroke="var(--ink)" strokeWidth={size < 40 ? 8 : 4} />
    </svg>
  );
}
