"use client";

import { useState } from "react";
import type { Database } from "@/lib/supabase/types";
import type { ProjectDeleteResponse } from "@/app/api/projects/[id]/route";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

interface ProjectCardProps {
  project: ProjectRow;
  commentCount: number;
  /** Called with the project id after a successful delete so the parent can remove it from the list. */
  onDeleted: (id: string) => void;
}

/** Human-readable label for the project type badge. */
function typeLabel(type: string) {
  if (type === "url") return "Website";
  if (type === "image") return "Image";
  if (type === "pdf") return "PDF";
  return type;
}

/** Dashboard card — shows a feedback request name, source, comment count, and a delete action. */
export default function ProjectCard({
  project,
  commentCount,
  onDeleted,
}: ProjectCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      const json: ProjectDeleteResponse = await res.json();
      if (!res.ok || "error" in json) {
        setDeleteError("error" in json ? json.error : "Delete failed");
        setDeleting(false);
        return;
      }
      onDeleted(project.id);
    } catch {
      setDeleteError("Network error — please try again");
      setDeleting(false);
    }
  }

  if (confirming) {
    return (
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          animation: "panel-enter 150ms ease-out both",
        }}
      >
        <div>
          <p
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--color-text-primary)",
              margin: "0 0 4px",
            }}
          >
            Delete this feedback request?
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-text-tertiary)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            This can&apos;t be undone.
          </p>
        </div>

        {deleteError && (
          <p style={{ fontSize: 12, color: "var(--color-danger)", margin: 0 }}>
            {deleteError}
          </p>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              flex: 1,
              background: "var(--color-danger)",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "8px 0",
              fontSize: 13,
              fontWeight: 500,
              cursor: deleting ? "not-allowed" : "pointer",
              opacity: deleting ? 0.6 : 1,
              transition: "opacity 150ms ease-out, scale 150ms ease-out",
            }}
            className="active:[scale:0.97]"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <button
            onClick={() => { setConfirming(false); setDeleteError(null); }}
            disabled={deleting}
            style={{
              flex: 1,
              background: "var(--color-base)",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: "8px 0",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "border-color 150ms ease-out, scale 150ms ease-out",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-text-tertiary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-border)")
            }
            className="active:[scale:0.97]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        transition: "border-color 150ms ease-out, box-shadow 150ms ease-out, transform 150ms ease-out",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-text-tertiary)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.transform = "none";
      }}
    >
      {/* Main clickable card area */}
      <a
        href={`/projects/${project.id}`}
        style={{
          display: "block",
          padding: 20,
          textDecoration: "none",
          paddingRight: 44, // room for the delete button
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--color-text-primary)",
                margin: "0 0 4px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {project.name}
            </p>
            {project.source_url && (
              <p
                style={{
                  fontSize: 12,
                  color: "var(--color-text-tertiary)",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {project.source_url}
              </p>
            )}
          </div>

          {/* Type badge */}
          <span
            style={{
              flexShrink: 0,
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
            {typeLabel(project.type)}
          </span>
        </div>

        {/* Comment count */}
        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 13 13"
            fill="none"
            style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }}
          >
            <path
              d="M11.5 1.5h-10a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h1.5v2l2.5-2h6a.5.5 0 0 0 .5-.5V2a.5.5 0 0 0-.5-.5Z"
              stroke="currentColor"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
            {commentCount} {commentCount === 1 ? "comment" : "comments"}
          </span>
        </div>
      </a>

      {/* Delete icon — sits over the card, top-right corner */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setConfirming(true);
        }}
        aria-label="Delete this feedback request"
        title="Delete"
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          width: 28,
          height: 28,
          borderRadius: 6,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-tertiary)",
          transition: "background 150ms ease-out, color 150ms ease-out",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-surface)";
          e.currentTarget.style.color = "var(--color-danger)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--color-text-tertiary)";
        }}
      >
        {/* Trash icon */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M3.5 3.5l.7 7.3a.5.5 0 0 0 .5.45h4.6a.5.5 0 0 0 .5-.45l.7-7.3" />
        </svg>
      </button>
    </div>
  );
}
