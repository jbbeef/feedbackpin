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
 * Clicking anywhere on the screenshot opens a comment form anchored to the click position.
 * Existing comments are shown as numbered pins.
 */
export default function Canvas({
  screenshotUrl,
  projectName,
  comments,
  shareToken,
  onCommentAdded,
}: Props) {
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  const [authorName, setAuthorName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("reviewerName") ?? "";
    }
    return "";
  });
  const [commentBody, setCommentBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    // Ignore clicks that originated inside a pin or the comment form
    const target = e.target as HTMLElement;
    if (target.closest("[data-pin]") || target.closest("[data-comment-form]")) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

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
      onCommentAdded(json.comment);
      setPendingPin(null);
      setCommentBody("");
    } catch {
      setSubmitError("Failed to save comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Position the comment form to stay within the canvas bounds
  function formStyle(pin: PendingPin): React.CSSProperties {
    const FORM_WIDTH_PCT = 28; // approximate % of canvas width
    const left = Math.min(pin.xPercent, 100 - FORM_WIDTH_PCT);
    const top =
      pin.yPercent < 65
        ? pin.yPercent + 4  // show below the pin
        : pin.yPercent - 38; // show above the pin

    return {
      position: "absolute",
      left: `${left}%`,
      top: `${top}%`,
      zIndex: 30,
      width: "220px",
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
        className="w-full h-auto block rounded-lg shadow-lg border border-zinc-200"
        data-testid="review-screenshot"
        draggable={false}
        style={{ pointerEvents: "none" }}
      />

      {/* Existing comment pins */}
      {comments.map((comment, index) => (
        <CommentPin
          key={comment.id}
          number={index + 1}
          xPercent={comment.x_percent}
          yPercent={comment.y_percent}
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
            zIndex: 20,
          }}
          className="w-7 h-7 rounded-full bg-indigo-400 border-2 border-white shadow-md flex items-center justify-center"
        >
          <span className="text-white text-xs font-bold">{comments.length + 1}</span>
        </div>
      )}

      {/* Comment form */}
      {pendingPin && (
        <div
          data-comment-form
          style={formStyle(pendingPin)}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-lg shadow-xl border border-zinc-200 p-3"
        >
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Your name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              required
              autoFocus
              data-testid="author-name-input"
              className="w-full mb-2 rounded border border-zinc-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <textarea
              placeholder="Leave a comment…"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              required
              rows={3}
              data-testid="comment-body-input"
              className="w-full mb-2 rounded border border-zinc-300 px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {submitError && (
              <p className="text-xs text-red-600 mb-1">{submitError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setPendingPin(null)}
                className="text-xs text-zinc-500 hover:text-zinc-700 px-2 py-1 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  submitting ||
                  !authorName.trim() ||
                  !commentBody.trim()
                }
                data-testid="submit-comment-button"
                className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3 py-1 rounded transition-colors"
              >
                {submitting ? "Saving…" : "Post"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
