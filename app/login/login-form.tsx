import Link from "next/link";

type LoginFormProps = {
  message?: string;
};

export function LoginForm({ message }: LoginFormProps) {
  return (
    <form action="/auth/sign-in" method="post">
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      <button type="submit">Sign in</button>

      <p className="form-note">
        If you previously used magic links, set your password via{" "}
        <Link href="/forgot-password">password reset</Link>.
      </p>
      {message ? <p className="form-status">{message}</p> : null}
    </form>
  );
}
