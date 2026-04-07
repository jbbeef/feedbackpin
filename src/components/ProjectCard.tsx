"use client";

import type { Database } from "@/lib/supabase/types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

interface ProjectCardProps {
  project: ProjectRow;
  commentCount: number;
}

/** Dashboard card showing a project's name, type, and comment count. */
export default function ProjectCard({ project, commentCount }: ProjectCardProps) {
  return (
    <a
      href={`/projects/${project.id}`}
      style={{
        display: "block",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        padding: 20,
        textDecoration: "none",
        transition: "border-color 150ms ease-out, box-shadow 150ms ease-out, transform 150ms ease-out",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--color-text-tertiary)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
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
          {project.type}
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
  );
}
