import Link from "next/link";
import { getCurrentPortal } from "@/utils/portal";

type AppShellProps = {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  showAdmin?: boolean;
  headerVariant?: "default" | "course" | "lesson";
  children: React.ReactNode;
};

export async function AppShell({
  title,
  eyebrow,
  actions,
  showAdmin = false,
  headerVariant = "default",
  children,
}: AppShellProps) {
  const portal = await getCurrentPortal();

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand" href="/library">
          <span className="brand-mark">{(portal?.name ?? "Portal").slice(0, 1)}</span>
          <span>{portal?.name ?? "Portal"} Library</span>
        </Link>
        <nav className="nav">
          <Link href="/library">Library</Link>
          <Link href="/account">Account</Link>
          {showAdmin ? <Link href="/admin/courses">Courses</Link> : null}
          {showAdmin ? <Link href="/admin/enrollments">Enrollments</Link> : null}
        </nav>
      </aside>
      <div className="shell-main">
        <header
          className={`page-header${
            headerVariant === "course"
              ? " page-header-course"
              : headerVariant === "lesson"
                ? " page-header-lesson"
                : ""
          }`}
        >
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
