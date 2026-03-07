"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const MAGIC_LINK_COOLDOWN_SECONDS = 60;
const MAGIC_LINK_STORAGE_KEY = "superabound-magic-link-next-at";

function getCooldownSecondsRemaining() {
  if (typeof window === "undefined") {
    return 0;
  }

  const nextAllowedAt = Number(window.localStorage.getItem(MAGIC_LINK_STORAGE_KEY) ?? "0");
  const seconds = Math.ceil((nextAllowedAt - Date.now()) / 1000);
  return seconds > 0 ? seconds : 0;
}

function startCooldown() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    MAGIC_LINK_STORAGE_KEY,
    String(Date.now() + MAGIC_LINK_COOLDOWN_SECONDS * 1000),
  );
}

function isRateLimitError(message: string) {
  return message.toLowerCase().includes("rate limit");
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    setCooldownSeconds(getCooldownSecondsRemaining());

    const intervalId = window.setInterval(() => {
      setCooldownSeconds(getCooldownSecondsRemaining());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (cooldownSeconds > 0) {
      setMessage(`Please wait ${cooldownSeconds}s before requesting another magic link.`);
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/library`,
        shouldCreateUser: false,
      },
    });

    if (error) {
      if (isRateLimitError(error.message)) {
        startCooldown();
        setCooldownSeconds(MAGIC_LINK_COOLDOWN_SECONDS);
        setMessage(
          "Too many login email requests were made. Wait one minute, then try again once.",
        );
      } else {
        setMessage(error.message);
      }

      setSubmitting(false);
      return;
    }

    startCooldown();
    setCooldownSeconds(MAGIC_LINK_COOLDOWN_SECONDS);
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
      <button type="submit" disabled={submitting || cooldownSeconds > 0}>
        {submitting
          ? "Sending..."
          : cooldownSeconds > 0
            ? `Wait ${cooldownSeconds}s`
            : "Send magic link"}
      </button>
      <p className="form-note">
        Use the email address already set up for your membership. One request is enough.
      </p>
      {message ? <p className="form-status">{message}</p> : null}
    </form>
  );
}
