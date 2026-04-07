"use client";

import { useState } from "react";
import CommentPin from "./CommentPin";
import type { Database } from "@/lib/supabase/types";
import type { CommentsPostResponse } from "@/app/api/review/[token]/comments/route";

type CommentRow = Database["public"]["Tables"]["comments"]["Row"];

interface PendingPin {
  xPercent: number;
  yPercent: number;
}

interface Props {
  screenshotUrl: string;
  projectName: string;
  comments: CommentRow[];
  shareToken: string;
  onCommentAdded: (comment: CommentRow) => void;
}

/**
 * Interactive annotation canvas.
 * Clicking anywhere on the screenshot opens a comment form anchored to the
 * click position. Existing comments are shown as numbered spring-animated pins.
 */
export default function Canvas({
  screenshotUrl,
  projectName,
  comments,
  shareToken,
  onCommentAdded,
}: Props) {
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [authorName, setAuthorName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("reviewerName") ?? "";
    }
    return "";
  });
  const [commentBody, setCommentBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const nameIsKnown = authorName.trim().length > 0;

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.closest("[data-pin]") || target.closest("[data-comment-form]")) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    setHasInteracted(true);
    setPendingPin({ xPercent, yPercent });
    setCommentBody("");
    setSubmitError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingPin) return;

    const trimmedName = authorName.trim();
    const trimmedBody = commentBody.trim();

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/review/${shareToken}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x_percent: pendingPin.xPercent,
          y_percent: pendingPin.yPercent,
          body: trimmedBody,
          author_name: trimmedName,
        }),
      });

      const json: CommentsPostResponse = await res.json();

      if ("error" in json) {
        setSubmitError(json.error);
        return;
      }

      // Persist name for future comments
      localStorage.setItem("reviewerName", trimmedName);

      // Close the form immediately so subsequent canvas clicks work right away,
      // then show a brief floating toast as success feedback.
      onCommentAdded(json.comment);
      setPendingPin(null);
      setCommentBody("");
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 1800);
    } catch {
      setSubmitError("Couldn't save your comment — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Position the form so it stays within the canvas bounds
  function formStyle(pin: PendingPin): React.CSSProperties {
    const FORM_WIDTH_PCT = 26;
    const left = Math.min(pin.xPercent, 100 - FORM_WIDTH_PCT);
    const top =
      pin.yPercent < 65
        ? pin.yPercent + 4   // below the pin
        : pin.yPercent - 42; // above the pin

    return {
      position: "absolute",
      left: `${left}%`,
      top: `${top}%`,
      zIndex: 30,
      width: 240,
      animation: "panel-enter 200ms ease-out both",
    };
  }

  return (
    <div
      className="relative w-full cursor-crosshair select-none"
      onClick={handleCanvasClick}
      data-testid="canvas"
    >
      {/* Screenshot */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={screenshotUrl}
        alt={`Screenshot of ${projectName}`}
        className="w-full h-auto block rounded-xl"
        style={{
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          border: "1px solid var(--color-border)",
          pointerEvents: "none",
        }}
        data-testid="review-screenshot"
        draggable={false}
      />

      {/* Success toast — floats above canvas briefly after a comment is posted */}
      {submitSuccess && (
        <div
          style={{
            position: "absolute",
            top: "5%",
            left: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "none",
            zIndex: 40,
            animation: "panel-enter 200ms ease-out both",
          }}
        >
          <div
            style={{
              background: "var(--color-success)",
              color: "white",
              fontSize: 13,
              fontWeight: 500,
              padding: "8px 16px",
              borderRadius: 100,
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              whiteSpace: "nowrap",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6.5" stroke="white" />
              <path d="M4.5 7l2 2 3.5-3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Comment added
          </div>
        </div>
      )}

      {/* Click hint — visible before first interaction */}
      {!hasInteracted && !pendingPin && (
        <div
          style={{
            position: "absolute",
            bottom: "5%",
            left: "50%",
            pointerEvents: "none",
            animation: "click-hint 2.4s ease-in-out infinite",
          }}
        >
          <div
            style={{
              background: "var(--color-text-primary)",
              color: "var(--color-base)",
              fontSize: 13,
              fontWeight: 500,
              padding: "8px 16px",
              borderRadius: 100,
              opacity: 0.82,
              whiteSpace: "nowrap",
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            }}
          >
            Click anywhere to leave feedback
          </div>
        </div>
      )}

      {/* Existing comment pins */}
      {comments.map((comment, index) => (
        <CommentPin
          key={comment.id}
          number={index + 1}
          xPercent={comment.x_percent}
          yPercent={comment.y_percent}
          resolved={comment.resolved}
        />
      ))}

      {/* Ghost pin while form is open */}
      {pendingPin && (
        <div
          data-pin
          style={{
            position: "absolute",
            left: `${pendingPin.xPercent}%`,
            top: `${pendingPin.yPercent}%`,
            transform: "translate(-50%, -50%)",
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--color-accent)",
            opacity: 0.6,
            border: "2px solid rgba(255,255,255,0.9)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 12,
            fontWeight: 500,
            zIndex: 20,
          }}
        >
          {comments.length + 1}
        </div>
      )}

      {/* Comment form */}
      {pendingPin && (
        <div
          data-comment-form
          style={formStyle(pendingPin)}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              background: "var(--color-base)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              overflow: "hidden",
            }}
          >
            <form onSubmit={handleSubmit}>
                {/* Name input — always rendered so tests can always find it.
                    Pre-filled from localStorage; de-emphasised when name is known. */}
                <div style={{ padding: "10px 12px 0" }}>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    required
                    autoFocus={!nameIsKnown}
                    data-testid="author-name-input"
                    style={{
                      width: "100%",
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      padding: "8px 10px",
                      fontSize: nameIsKnown ? 12 : 14,
                      color: nameIsKnown ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 150ms ease-out, box-shadow 150ms ease-out",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--color-accent)";
                      e.target.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--color-border)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Comment body */}
                <div style={{ padding: "8px 12px 0" }}>
                  <textarea
                    placeholder="Leave a comment…"
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    required
                    rows={3}
                    autoFocus={nameIsKnown}
                    data-testid="comment-body-input"
                    style={{
                      width: "100%",
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      padding: "8px 10px",
                      fontSize: 14,
                      color: "var(--color-text-primary)",
                      resize: "none",
                      outline: "none",
                      boxSizing: "border-box",
                      lineHeight: 1.5,
                      transition: "border-color 150ms ease-out, box-shadow 150ms ease-out",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--color-accent)";
                      e.target.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--color-border)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                {submitError && (
                  <p
                    style={{
                      margin: "4px 12px 0",
                      fontSize: 12,
                      color: "var(--color-danger)",
                    }}
                  >
                    {submitError}
                  </p>
                )}

                {/* Actions */}
                <div
                  style={{
                    padding: "8px 12px 10px",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setPendingPin(null)}
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-tertiary)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "6px 8px",
                      borderRadius: 6,
                      transition: "color 150ms ease-out",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--color-text-secondary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--color-text-tertiary)")
                    }
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      submitting || !authorName.trim() || !commentBody.trim()
                    }
                    data-testid="submit-comment-button"
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "white",
                      background: "var(--color-accent)",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 14px",
                      cursor: "pointer",
                      transition: "background 150ms ease-out, scale 150ms ease-out",
                      opacity: submitting || !authorName.trim() || !commentBody.trim() ? 0.45 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.disabled)
                        e.currentTarget.style.background = "var(--color-accent-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--color-accent)";
                    }}
                    className="active:[scale:0.97]"
                  >
                    {submitting ? "Saving…" : "Post"}
                  </button>
                </div>
              </form>
          </div>
        </div>
      )}
    </div>
  );
}
