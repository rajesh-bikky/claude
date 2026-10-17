import Link from "next/link";
import { Logo } from "./logo";

export function Nav() {
  return (
    <nav className="nav">
      <Link href="/" className="brand"><Logo size={28} />BITNIT</Link>
      <span className="spacer" />
      <Link className="link" href="/admin">Dashboard</Link>
      <Link className="link" href="/admin/goals">Goals</Link>
      <Link className="link" href="/admin/scout">Scout</Link>
      <Link className="link" href="/admin/new">New bit</Link>
      <Link className="link" href="/admin/settings">Settings</Link>
      <Link className="link" href="/demo">Demo product ↗</Link>
    </nav>
  );
}
