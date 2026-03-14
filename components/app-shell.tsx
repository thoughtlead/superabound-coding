import Link from "next/link";

type AppShellProps = {
  title: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  showAdmin?: boolean;
  children: React.ReactNode;
};

export function AppShell({
  title,
  eyebrow,
  actions,
  showAdmin = false,
  children,
}: AppShellProps) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand" href="/library">
          <span className="brand-mark">S</span>
          <span>Superabound Library</span>
        </Link>
        <nav className="nav">
          <Link href="/library">Library</Link>
          <Link href="/account">Account</Link>
          {showAdmin ? <Link href="/admin/courses">Courses</Link> : null}
          {showAdmin ? <Link href="/admin/enrollments">Enrollments</Link> : null}
        </nav>
      </aside>
      <div className="shell-main">
        <header className="page-header">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h1>{title}</h1>
          </div>
          {actions ? <div className="page-actions">{actions}</div> : null}
        </header>
        {children}
      </div>
    </div>
  );
}
