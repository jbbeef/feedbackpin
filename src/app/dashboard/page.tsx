import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";
import ProjectGrid from "@/components/ProjectGrid";
import type { Database } from "@/lib/supabase/types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectWithCount = ProjectRow & { comments: { count: number }[] };

/** Owner dashboard — lists all feedback requests. Protected: requires auth. */
export default async function DashboardPage() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: rawProjects } = await supabase
    .from("projects")
    .select("*, comments(count)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const projects = rawProjects as unknown as ProjectWithCount[] | null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-base)" }}>
      {/* Header */}
      <header
        style={{
          background: "var(--color-base)",
          borderBottom: "1px solid var(--color-border)",
          padding: "14px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "var(--color-accent)",
            letterSpacing: "-0.01em",
          }}
        >
          FeedbackPin
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>
            {user.email}
          </span>
          <LogoutButton />
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 32px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 32,
          }}
        >
          <h1
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: "var(--color-text-primary)",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Your work
          </h1>
          {/* Tailwind hover classes — safe in server components (no event handlers) */}
          <a
            href="/projects/new"
            className="hover:bg-[--color-accent-hover] active:[scale:0.97]"
            style={{
              background: "var(--color-accent)",
              color: "white",
              borderRadius: 8,
              padding: "8px 18px",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              transition: "background 150ms ease-out",
              display: "inline-block",
            }}
          >
            New feedback request
          </a>
        </div>

        <ProjectGrid initialProjects={projects ?? []} />
      </main>
    </div>
  );
}
