import type { Database } from "@/lib/supabase/types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

interface ProjectCardProps {
  project: ProjectRow;
  commentCount: number;
}

/** Dashboard card showing a project's name, type, URL, and comment count. */
export default function ProjectCard({ project, commentCount }: ProjectCardProps) {
  return (
    <a
      href={`/projects/${project.id}`}
      className="block bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900 truncate">
            {project.name}
          </p>
          {project.source_url && (
            <p className="mt-0.5 text-xs text-zinc-400 truncate">
              {project.source_url}
            </p>
          )}
        </div>
        <span className="shrink-0 inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 uppercase">
          {project.type}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-1 text-xs text-zinc-500">
        <span>{commentCount}</span>
        <span>{commentCount === 1 ? "comment" : "comments"}</span>
      </div>
    </a>
  );
}
