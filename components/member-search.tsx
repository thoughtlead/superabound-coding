"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type MemberSearchResult = {
  email: string;
  fullName: string | null;
  id: string;
};

export function MemberSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      abortRef.current?.abort();
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setLoading(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/member-search?q=${encodeURIComponent(trimmedQuery)}`,
          {
            signal: controller.signal,
          },
        );
        const payload = (await response.json()) as { results?: MemberSearchResult[] };

        if (!response.ok) {
          setResults([]);
          setOpen(false);
          return;
        }

        setResults(payload.results ?? []);
        setOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="member-search-shell">
      <div className="member-search-row">
        <input
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (results.length > 0) {
              setOpen(true);
            }
          }}
          placeholder="Find a member by name or email"
          type="search"
          value={query}
        />
        {loading ? <span className="form-note">Searching...</span> : null}
        <button
          className="button button-secondary"
          onClick={() => {
            setQuery("");
            setResults([]);
            setOpen(false);
            router.push("/admin/enrollments");
          }}
          type="button"
        >
          Clear
        </button>
      </div>
      {open ? (
        <div className="member-search-results">
          {results.length > 0 ? (
            results.map((result) => (
              <button
                key={result.id}
                className="member-search-result"
                onClick={() => {
                  setOpen(false);
                  router.push(`/admin/enrollments?memberId=${result.id}`);
                }}
                type="button"
              >
                <span>
                  <strong>{result.fullName ?? result.email}</strong>
                  <span>{result.email}</span>
                </span>
              </button>
            ))
          ) : (
            <div className="member-search-empty">No matching members</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
