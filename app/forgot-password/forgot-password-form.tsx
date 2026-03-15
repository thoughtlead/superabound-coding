"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ForgotPasswordFormProps = {
  message?: string;
};

export function ForgotPasswordForm({ message }: ForgotPasswordFormProps) {
  const [redirectOrigin, setRedirectOrigin] = useState("");

  useEffect(() => {
    setRedirectOrigin(window.location.origin);
  }, []);

  return (
    <form action="/auth/forgot-password" method="post">
      <input name="redirectOrigin" type="hidden" value={redirectOrigin} />
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required />

      <button type="submit">Send reset link</button>
      <p className="form-note">
        Return to <Link href="/login">sign in</Link>.
      </p>
      {message ? <p className="form-status">{message}</p> : null}
    </form>
  );
}
