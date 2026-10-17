import Link from "next/link";

export function Nav() {
  return (
    <nav className="nav">
      <Link href="/" className="brand"><span className="mark">B</span>BITNIT</Link>
      <span className="spacer" />
      <Link className="link" href="/admin">Ideas</Link>
      <Link className="link" href="/admin/new">New idea</Link>
      <Link className="link" href="/demo">Demo product ↗</Link>
    </nav>
  );
}
