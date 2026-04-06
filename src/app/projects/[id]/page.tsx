"use client";

import { useEffect, useState } from "react";
import type { ProjectGetResponse } from "@/app/api/projects/[id]/route";
import type { Database } from "@/lib/supabase/types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

type Props = { params: Promise<{ id: string }> };

/** Owner project view — shows the project canvas (screenshot) and metadata. */
export default function ProjectPage({ params }: Props) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resolve the dynamic params Promise (Next.js 16 breaking change)
  useEffect(() => {
    params.then(({ id }) => setProjectId(id));
  }, [params]);

  // Fetch project and poll until screenshot_url is populated
  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    async function fetchProject() {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        const json: ProjectGetResponse = await res.json();
        if (!cancelled)
          setError("error" in json ? json.error : "Failed to load project");
        return null;
      }
      const json: ProjectGetResponse = await res.json();
      if ("error" in json) {
        if (!cancelled) setError(json.error);
        return null;
      }
      return json.project;
    }

    async function poll() {
      const p = await fetchProject();
      if (cancelled || !p) return;

      setProject(p);

      // Keep polling until screenshot_url is set (max ~60s at 2s interval)
      if (!p.screenshot_url && p.type === "url") {
        let attempts = 0;
        const interval = setInterval(async () => {
          if (cancelled) {
            clearInterval(interval);
            return;
          }
          attempts++;
          const updated = await fetchProject();
          if (!updated) {
            clearInterval(interval);
            return;
          }
          setProject(updated);
          if (updated.screenshot_url || attempts >= 30) {
            clearInterval(interval);
          }
        }, 2000);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <a href="/dashboard" className="text-lg font-semibold text-zinc-900">
          FeedbackPin
        </a>
        <span className="text-sm text-zinc-500 truncate max-w-sm">
          {project.name}
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-6 py-8">
        <div className="w-full max-w-5xl">
          {project.screenshot_url ? (
            // Screenshot is available — render the canvas
            <div className="relative w-full rounded-lg overflow-hidden shadow-lg border border-zinc-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.screenshot_url}
                alt={`Screenshot of ${project.name}`}
                className="w-full h-auto block"
                data-testid="project-screenshot"
              />
            </div>
          ) : project.type === "image" && project.screenshot_url ? (
            // Image project with uploaded file
            <div className="relative w-full rounded-lg overflow-hidden shadow-lg border border-zinc-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.screenshot_url}
                alt={project.name}
                className="w-full h-auto block"
                data-testid="project-screenshot"
              />
            </div>
          ) : (
            // Screenshot not yet available
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 bg-white py-24 text-center">
              {project.type === "url" ? (
                <>
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm font-medium text-zinc-700">
                    Capturing screenshot…
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    This usually takes 5–15 seconds
                  </p>
                </>
              ) : (
                <p className="text-sm text-zinc-500">No preview available</p>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center gap-4">
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 uppercase tracking-wide">
              {project.type}
            </span>
            {project.source_url && project.type === "url" && (
              <a
                href={project.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:text-indigo-700 truncate"
              >
                {project.source_url}
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
