import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";
import ProjectCard from "@/components/ProjectCard";
import type { Database } from "@/lib/supabase/types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectWithCount = ProjectRow & { comments: { count: number }[] };

/** Owner dashboard — lists all projects with comment counts. Protected: requires auth. */
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

  if (!user) {
    redirect("/login");
  }

  // Fetch projects with a count of their comments via embedded relation
  const { data: rawProjects } = await supabase
    .from("projects")
    .select("*, comments(count)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const projects = rawProjects as unknown as ProjectWithCount[] | null;

  return (
    <div className="min-h-full bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">FeedbackPin</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500">{user.email}</span>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-zinc-900">Projects</h2>
          <a
            href="/projects/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            New project
          </a>
        </div>

        {!projects || projects.length === 0 ? (
          <p className="text-zinc-500 text-sm">
            No projects yet. Create one to get started.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const commentCount = project.comments?.[0]?.count ?? 0;
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  commentCount={commentCount}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
