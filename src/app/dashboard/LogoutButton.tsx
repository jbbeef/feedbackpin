"use client";

import { createClient } from "@/lib/supabase/client";

/** Button that signs the current user out and redirects to /login. */
export default function LogoutButton() {
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    // Full-page navigation clears the session cookie reliably on Next.js 16.
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
    >
      Log out
    </button>
  );
}
