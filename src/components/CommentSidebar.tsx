"use client";

import type { Database } from "@/lib/supabase/types";

type CommentRow = Database["public"]["Tables"]["comments"]["Row"];

interface Props {
  comments: CommentRow[];
  /** Called when owner clicks "Resolve" on an open comment. Absent on reviewer view. */
  onResolve?: (id: string) => void;
  /** Called when owner clicks "Reopen" on a resolved comment. Absent on reviewer view. */
  onReopen?: (id: string) => void;
  /** ID of the comment currently being toggled — shows loading state. */
  resolving?: string | null;
}

/** Sidebar listing all top-level comment pins in order. Open comments first, resolved at bottom. */
export default function CommentSidebar({
  comments,
  onResolve,
  onReopen,
  resolving,
}: Props) {
  const open = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);
  const isOwner = !!(onResolve || onReopen);

  return (
    <aside
      style={{
        width: 288,
        flexShrink: 0,
        background: "var(--color-base)",
        borderLeft: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <h2
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: 0,
          }}
        >
          {comments.length > 0
            ? `${comments.length} comment${comments.length === 1 ? "" : "s"}`
            : "Comments"}
        </h2>
      </div>

      {comments.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 24px",
            textAlign: "center",
            gap: 8,
          }}
        >
          <p
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--color-text-primary)",
              margin: 0,
            }}
          >
            No comments yet
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-text-tertiary)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {isOwner
              ? "Share the review link so others can leave feedback"
              : "Click anywhere on the image to pin a comment"}
          </p>
        </div>
      ) : (
        <ul
          style={{
            flex: 1,
            overflowY: "auto",
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {/* Open comments */}
          {open.map((comment, index) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              index={index}
              globalIndex={comments.indexOf(comment)}
              resolved={false}
              onAction={onResolve ? () => onResolve(comment.id) : undefined}
              actionLabel="Resolve"
              loading={resolving === comment.id}
            />
          ))}

          {/* Resolved section divider */}
          {resolved.length > 0 && (
            <li
              style={{
                padding: "8px 20px",
                background: "var(--color-surface)",
                borderBottom: "1px solid var(--color-border)",
                borderTop: open.length > 0 ? "1px solid var(--color-border)" : undefined,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--color-text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Resolved ({resolved.length})
              </span>
            </li>
          )}

          {/* Resolved comments */}
          {resolved.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              index={-1}
              globalIndex={comments.indexOf(comment)}
              resolved={true}
              onAction={onReopen ? () => onReopen(comment.id) : undefined}
              actionLabel="Reopen"
              loading={resolving === comment.id}
            />
          ))}
        </ul>
      )}
    </aside>
  );
}

interface ItemProps {
  comment: CommentRow;
  /** Position within its section (open or resolved). -1 = resolved, use globalIndex for number. */
  index: number;
  globalIndex: number;
  resolved: boolean;
  onAction?: () => void;
  actionLabel: "Resolve" | "Reopen";
  loading: boolean;
}

function CommentItem({
  comment,
  globalIndex,
  resolved,
  onAction,
  actionLabel,
  loading,
}: ItemProps) {
  return (
    <li
      data-testid={`comment-item-${globalIndex + 1}`}
      style={{
        padding: "14px 20px",
        borderBottom: "1px solid var(--color-border)",
        animation: "panel-enter 200ms ease-out both",
        opacity: resolved ? 0.65 : 1,
        transition: "opacity 150ms ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Pin number badge */}
        <span
          style={{
            flexShrink: 0,
            marginTop: 1,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: resolved
              ? "var(--color-text-tertiary)"
              : "var(--color-accent)",
            color: "white",
            fontSize: 11,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {globalIndex + 1}
        </span>

        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-primary)",
              margin: "0 0 3px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {comment.author_name}
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-text-secondary)",
              margin: 0,
              lineHeight: 1.5,
              wordBreak: "break-word",
            }}
          >
            {comment.body}
          </p>

          {/* Resolve / Reopen button — only shown in owner view */}
          {onAction && (
            <button
              onClick={onAction}
              disabled={loading}
              data-testid={`${actionLabel.toLowerCase()}-button-${globalIndex + 1}`}
              style={{
                marginTop: 8,
                fontSize: 12,
                fontWeight: 500,
                color: resolved
                  ? "var(--color-accent)"
                  : "var(--color-text-tertiary)",
                background: "none",
                border: `1px solid ${resolved ? "var(--color-accent)" : "var(--color-border)"}`,
                borderRadius: 6,
                padding: "3px 10px",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
                transition: "color 150ms ease-out, border-color 150ms ease-out",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.color = resolved
                    ? "var(--color-accent-hover)"
                    : "var(--color-text-secondary)";
                  e.currentTarget.style.borderColor = resolved
                    ? "var(--color-accent-hover)"
                    : "var(--color-text-tertiary)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = resolved
                  ? "var(--color-accent)"
                  : "var(--color-text-tertiary)";
                e.currentTarget.style.borderColor = resolved
                  ? "var(--color-accent)"
                  : "var(--color-border)";
              }}
            >
              {loading ? (resolved ? "Reopening…" : "Resolving…") : actionLabel}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
