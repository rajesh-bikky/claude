import Link from "next/link";

export function Nav() {
  return (
    <nav className="nav">
      <Link href="/" className="brand"><span className="mark">B</span>BITNIT</Link>
      <span className="spacer" />
      <Link className="link" href="/admin">Dashboard</Link>
      <Link className="link" href="/admin/suggested">Suggested</Link>
      <Link className="link" href="/admin/new">New bit</Link>
      <Link className="link" href="/demo">Demo product ↗</Link>
    </nav>
  );
}
