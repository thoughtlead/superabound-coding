import Link from "next/link";

type EmptyStateProps = {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  return (
    <section className="panel empty-state">
      <h2>{title}</h2>
      <p>{body}</p>
      {actionHref && actionLabel ? (
        <Link className="button button-secondary" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
