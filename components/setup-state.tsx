export function SetupState() {
  return (
    <section className="panel empty-state">
      <h2>Supabase setup required</h2>
      <p>
        Apply the library schema before loading courses. The SQL migration is in
        `supabase/migrations/20260307_library_core.sql`.
      </p>
    </section>
  );
}
