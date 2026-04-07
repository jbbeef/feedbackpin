"use client";

import { useEffect, useState, useCallback } from "react";
import type { ProjectGetResponse } from "@/app/api/projects/[id]/route";
import type { ShareResponse } from "@/app/api/projects/[id]/share/route";
import type { ProjectCommentsGetResponse } from "@/app/api/projects/[id]/comments/route";
import type { CommentPatchResponse } from "@/app/api/comments/[id]/route";
import type { Database } from "@/lib/supabase/types";
import CommentPin from "@/components/CommentPin";
import CommentSidebar from "@/components/CommentSidebar";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type CommentRow = Database["public"]["Tables"]["comments"]["Row"];

type Props = { params: Promise<{ id: string }> };

/** Owner project view — canvas with pins + comment sidebar with resolve/reopen. */
export default function ProjectPage({ params }: Props) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    params.then(({ id }) => setProjectId(id));
  }, [params]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    async function fetchProject() {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        const json: ProjectGetResponse = await res.json();
        if (!cancelled) setError("error" in json ? json.error : "Failed to load project");
        return null;
      }
      const json: ProjectGetResponse = await res.json();
      if ("error" in json) { if (!cancelled) setError(json.error); return null; }
      return json.project;
    }

    async function poll() {
      const p = await fetchProject();
      if (cancelled || !p) return;
      setProject(p);
      if (!p.screenshot_url && p.type === "url") {
        let attempts = 0;
        const interval = setInterval(async () => {
          if (cancelled) { clearInterval(interval); return; }
          attempts++;
          const updated = await fetchProject();
          if (!updated) { clearInterval(interval); return; }
          setProject(updated);
          if (updated.screenshot_url || attempts >= 30) clearInterval(interval);
        }, 2000);
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [projectId]);

  // Fetch comments once the project is loaded
  useEffect(() => {
    if (!projectId || !project) return;
    fetch(`/api/projects/${projectId}/comments`)
      .then((r) => r.json())
      .then((json: ProjectCommentsGetResponse) => {
        if ("comments" in json) setComments(json.comments);
      })
      .catch(() => {
        // Non-fatal
      });
  }, [projectId, project]);

  const handleResolve = useCallback(async (commentId: string) => {
    setResolving(commentId);
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: true }),
      });
      const json: CommentPatchResponse = await res.json();
      if ("comment" in json) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? json.comment : c))
        );
      }
    } catch {
      // Non-fatal — comment stays open
    } finally {
      setResolving(null);
    }
  }, []);

  const handleReopen = useCallback(async (commentId: string) => {
    setResolving(commentId);
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: false }),
      });
      const json: CommentPatchResponse = await res.json();
      if ("comment" in json) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? json.comment : c))
        );
      }
    } catch {
      // Non-fatal
    } finally {
      setResolving(null);
    }
  }, []);

  async function handleShare() {
    if (!projectId) return;
    setShareLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/share`, { method: "POST" });
      const json: ShareResponse = await res.json();
      if ("error" in json) setError(json.error);
      else setShareUrl(`${window.location.origin}/review/${json.token}`);
    } catch {
      setError("Failed to generate share link");
    } finally {
      setShareLoading(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

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
          gap: 8,
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
          Something went wrong
        </p>
        <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: 0 }}>{error}</p>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 320 }}>
          {[90, 70, 50].map((w, i) => (
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
    <div style={{ minHeight: "100vh", background: "var(--color-base)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header
        style={{
          background: "var(--color-base)",
          borderBottom: "1px solid var(--color-border)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          gap: 16,
        }}
      >
        <a
          href="/dashboard"
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "var(--color-accent)",
            textDecoration: "none",
            letterSpacing: "-0.01em",
            flexShrink: 0,
          }}
        >
          FeedbackPin
        </a>
        <span
          style={{
            fontSize: 14,
            color: "var(--color-text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            textAlign: "center",
          }}
        >
          {project.name}
        </span>
        <button
          onClick={handleShare}
          disabled={shareLoading}
          data-testid="share-button"
          style={{
            flexShrink: 0,
            background: "var(--color-accent)",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "8px 18px",
            fontSize: 14,
            fontWeight: 500,
            cursor: shareLoading ? "not-allowed" : "pointer",
            opacity: shareLoading ? 0.6 : 1,
            transition: "background 150ms ease-out, scale 150ms ease-out",
          }}
          onMouseEnter={(e) => {
            if (!shareLoading) e.currentTarget.style.background = "var(--color-accent-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--color-accent)";
          }}
          className="active:[scale:0.97]"
        >
          {shareLoading ? "Generating…" : "Share"}
        </button>
      </header>

      {/* Share URL banner */}
      {shareUrl && (
        <div
          style={{
            background: "var(--color-accent-subtle)",
            borderBottom: "1px solid var(--color-border)",
            padding: "10px 24px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            animation: "panel-enter 200ms ease-out both",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-accent)", flexShrink: 0 }}>
            Review link
          </span>
          <input
            readOnly
            value={shareUrl}
            data-testid="share-url"
            style={{
              flex: 1,
              background: "var(--color-base)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: "7px 12px",
              fontSize: 13,
              color: "var(--color-text-secondary)",
              fontFamily: "var(--font-mono)",
              outline: "none",
            }}
          />
          <button
            onClick={handleCopy}
            data-testid="copy-button"
            style={{
              flexShrink: 0,
              background: shareCopied ? "var(--color-success)" : "var(--color-base)",
              color: shareCopied ? "white" : "var(--color-accent)",
              border: `1px solid ${shareCopied ? "var(--color-success)" : "var(--color-accent)"}`,
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 150ms ease-out",
            }}
          >
            {shareCopied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}

      {/* Body: canvas + sidebar */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Canvas area */}
        <main style={{ flex: 1, overflowY: "auto", padding: "40px" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            {project.screenshot_url ? (
              /* Canvas with pins overlay */
              <div style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={project.screenshot_url}
                  alt={`Screenshot of ${project.name}`}
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                  }}
                  data-testid="project-screenshot"
                />
                {/* Comment pins (read-only for owner) */}
                {comments.map((comment, index) => (
                  <CommentPin
                    key={comment.id}
                    number={index + 1}
                    xPercent={comment.x_percent}
                    yPercent={comment.y_percent}
                    resolved={comment.resolved}
                  />
                ))}
              </div>
            ) : (
              /* Pulse skeleton while screenshot is being captured */
              <div
                style={{
                  borderRadius: 12,
                  border: "2px dashed var(--color-border)",
                  background: "var(--color-surface)",
                  padding: "80px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  textAlign: "center",
                }}
              >
                {project.type === "url" ? (
                  <>
                    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", marginBottom: 4 }}>
                      {[32, 48, 40, 56, 36].map((h, i) => (
                        <div
                          key={i}
                          style={{
                            width: 6,
                            height: h,
                            borderRadius: 3,
                            background: "var(--color-accent)",
                            opacity: 0.4,
                            animation: `pulse-load 1.2s ease-in-out ${i * 0.12}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
                      Capturing screenshot…
                    </p>
                    <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: 0 }}>
                      Usually takes 5–15 seconds
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
                      No preview available
                    </p>
                    <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: 0 }}>
                      The project was created without an image
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Metadata */}
            {project.screenshot_url && (
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--color-text-tertiary)",
                    background: "var(--color-border)",
                    borderRadius: 6,
                    padding: "3px 8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {project.type}
                </span>
                {project.source_url && project.type === "url" && (
                  <a
                    href={project.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 13,
                      color: "var(--color-accent)",
                      textDecoration: "none",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                  >
                    {project.source_url}
                  </a>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Comment sidebar with resolve/reopen */}
        <CommentSidebar
          comments={comments}
          onResolve={handleResolve}
          onReopen={handleReopen}
          resolving={resolving}
        />
      </div>
    </div>
  );
}
