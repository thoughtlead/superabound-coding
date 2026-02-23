import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  async function logout() {
    "use server";

    const authClient = createClient();
    await authClient.auth.signOut();
    redirect("/login");
  }

  return (
    <main>
      <h1>Account</h1>
      <p>Email: {user.email}</p>
      <form action={logout}>
        <button type="submit">Log out</button>
      </form>
      <p>
        <Link href="/library">Back to library</Link>
      </p>
    </main>
  );
}
