"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type EmailFormProps = {
  currentEmail: string;
  submitLabel: string;
  successRedirect: string;
};

export function EmailForm({
  currentEmail,
  submitLabel,
  successRedirect,
}: EmailFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(currentEmail);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setMessage("Email is required.");
      return;
    }

    if (email.trim().toLowerCase() === currentEmail.toLowerCase()) {
      setMessage("Enter a different email address.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      email: email.trim(),
    });

    if (error) {
      setMessage(error.message);
      setSubmitting(false);
      return;
    }

    const successMessage =
      "Check your inbox to confirm your email change. If secure email change is enabled, Supabase requires confirmation from both your current and new email addresses.";
    router.push(`${successRedirect}?message=${encodeURIComponent(successMessage)}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">New email</label>
      <input
        autoComplete="email"
        id="email"
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        required
        type="email"
        value={email}
      />

      <button disabled={submitting} type="submit">
        {submitting ? "Saving..." : submitLabel}
      </button>
      {message ? <p className="form-status">{message}</p> : null}
    </form>
  );
}
