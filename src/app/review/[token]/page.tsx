"use client";

import { useEffect, useState, useCallback } from "react";
import type { ReviewResponse } from "@/app/api/review/[token]/route";
import type { CommentsGetResponse } from "@/app/api/review/[token]/comments/route";
import type { Database } from "@/lib/supabase/types";
import Canvas from "@/components/Canvas";
import CommentSidebar from "@/components/CommentSidebar";
import { useComments } from "@/hooks/useComments";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type CommentRow = Database["public"]["Tables"]["comments"]["Row"];

type Props = { params: Promise<{ token: string }> };

/** Public reviewer canvas — accessible via share token, no login required. */
export default function ReviewPage({ params }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Resolve the dynamic params Promise (Next.js 16 breaking change)
  useEffect(() => {
    params.then(({ token }) => setToken(token));
  }, [params]);

  // Fetch project data
  useEffect(() => {
    if (!token) return;
    fetch(`/api/review/${token}`)
      .then((r) => r.json())
      .then((json: ReviewResponse) => {
        if ("error" in json) setError(json.error);
        else setProject(json.project);
      })
      .catch(() => setError("Failed to load project"));
  }, [token]);

  // Fetch initial comments once project is loaded
  useEffect(() => {
    if (!token || !project) return;
    fetch(`/api/review/${token}/comments`)
      .then((r) => r.json())
      .then((json: CommentsGetResponse) => {
        if ("comments" in json) setComments(json.comments);
      })
      .catch(() => {
        // Non-fatal — comments just won't show initially
      });
  }, [token, project]);

  // Deduplicated append — used by both Canvas (local submit) and Realtime
  const addComment = useCallback((comment: CommentRow) => {
    setComments((prev) => {
      if (prev.some((c) => c.id === comment.id)) return prev;
      return [...prev, comment];
    });
  }, []);

  // Realtime subscription for comments posted by other users
  useComments(project?.id ?? null, addComment);

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-red-600 text-sm" data-testid="review-error">
          {error}
        </p>
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
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between shrink-0">
        <span className="text-lg font-semibold text-zinc-900">FeedbackPin</span>
        <span
          className="text-sm text-zinc-500 truncate max-w-sm"
          data-testid="review-project-name"
        >
          {project.name}
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-5xl mx-auto">
            {project.screenshot_url ? (
              <Canvas
                screenshotUrl={project.screenshot_url}
                projectName={project.name}
                comments={comments}
                shareToken={token!}
                onCommentAdded={addComment}
              />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 bg-white py-24 text-center">
                <p className="text-sm text-zinc-500">No preview available yet</p>
              </div>
            )}

            {project.screenshot_url && (
              <p className="mt-3 text-xs text-zinc-400 text-center">
                Click anywhere on the image to leave a comment
              </p>
            )}
          </div>
        </main>

        {/* Comment sidebar */}
        <CommentSidebar comments={comments} />
      </div>
    </div>
  );
}
