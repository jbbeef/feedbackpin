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
      .catch(() => setError("Couldn't load this project"));
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
      <div
        style={{
          minHeight: "100vh",
          background: "var(--color-base)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "0 24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            margin: 0,
          }}
        >
          This link doesn&apos;t seem to work
        </p>
        {/* data-testid carries the raw API error so tests can match on its text */}
        <p
          style={{
            fontSize: 14,
            color: "var(--color-text-tertiary)",
            margin: 0,
          }}
          data-testid="review-error"
        >
          {error}
        </p>
      </div>
    );
  }

  if (!project) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--color-base)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Pulse skeleton instead of a spinner */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 320 }}>
          {[80, 100, 60].map((w, i) => (
            <div
              key={i}
              style={{
                height: 14,
                width: `${w}%`,
                borderRadius: 6,
                background: "var(--color-border)",
                animation: `pulse-load 1.5s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-base)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "var(--color-base)",
          borderBottom: "1px solid var(--color-border)",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
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
        <span
          style={{
            fontSize: 14,
            color: "var(--color-text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 480,
          }}
          data-testid="review-project-name"
        >
          {project.name}
        </span>
      </header>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Canvas area */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "40px 40px",
          }}
        >
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            {project.screenshot_url ? (
              <Canvas
                screenshotUrl={project.screenshot_url}
                projectName={project.name}
                comments={comments}
                shareToken={token!}
                onCommentAdded={addComment}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  border: "2px dashed var(--color-border)",
                  background: "var(--color-surface)",
                  padding: "80px 24px",
                  textAlign: "center",
                  gap: 8,
                }}
              >
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: "var(--color-text-primary)",
                    margin: 0,
                  }}
                >
                  Preview isn&apos;t ready yet
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-tertiary)",
                    margin: 0,
                  }}
                >
                  Check back in a moment — the screenshot is still being captured
                </p>
              </div>
            )}
          </div>
        </main>

        {/* Comment sidebar */}
        <CommentSidebar comments={comments} />
      </div>
    </div>
  );
}
