"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/library`,
      },
    });

    if (error) {
      setMessage(error.message);
      setSubmitting(false);
      return;
    }

    setMessage("Check your email for the login link.");
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <button type="submit" disabled={submitting}>
        {submitting ? "Sending..." : "Send magic link"}
      </button>
      {message ? <p>{message}</p> : null}
    </form>
  );
}
