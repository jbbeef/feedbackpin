"use client";

import { useState } from "react";
import ProjectCard from "./ProjectCard";
import type { Database } from "@/lib/supabase/types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectWithCount = ProjectRow & { comments: { count: number }[] };

interface Props {
  initialProjects: ProjectWithCount[];
}

/** Client component — owns the mutable project list and handles delete-without-reload. */
export default function ProjectGrid({ initialProjects }: Props) {
  const [projects, setProjects] = useState<ProjectWithCount[]>(initialProjects);

  /** Remove a deleted project from the local list immediately. */
  function handleDeleted(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  if (projects.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px",
          borderRadius: 12,
          border: "2px dashed var(--color-border)",
          textAlign: "center",
          gap: 12,
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
          Nothing here yet
        </p>
        <p
          style={{
            fontSize: 13,
            color: "var(--color-text-tertiary)",
            margin: 0,
          }}
        >
          Upload a design file or document and share it for feedback
        </p>
        <a
          href="/projects/new"
          style={{
            marginTop: 8,
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
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--color-accent-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "var(--color-accent)")
          }
        >
          New feedback request
        </a>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      }}
    >
      {projects.map((project) => {
        const commentCount = project.comments?.[0]?.count ?? 0;
        return (
          <ProjectCard
            key={project.id}
            project={project}
            commentCount={commentCount}
            onDeleted={handleDeleted}
          />
        );
      })}
    </div>
  );
}
