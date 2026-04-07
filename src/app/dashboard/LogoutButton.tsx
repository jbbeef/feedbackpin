"use client";

import { createClient } from "@/lib/supabase/client";

/** Button that signs the current user out and redirects to /login. */
export default function LogoutButton() {
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        fontSize: 13,
        fontWeight: 500,
        color: "var(--color-text-tertiary)",
        background: "none",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        padding: "6px 12px",
        cursor: "pointer",
        transition: "color 150ms ease-out, border-color 150ms ease-out",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--color-text-primary)";
        e.currentTarget.style.borderColor = "var(--color-text-tertiary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--color-text-tertiary)";
        e.currentTarget.style.borderColor = "var(--color-border)";
      }}
    >
      Log out
    </button>
  );
}
