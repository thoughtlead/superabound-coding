import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function LibraryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main>
      <h1>Library</h1>
      <p>You are logged in as {user.email}.</p>
      <p>
        <Link href="/account">Go to account</Link>
      </p>
    </main>
  );
}
