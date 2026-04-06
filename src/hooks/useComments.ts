"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type CommentRow = Database["public"]["Tables"]["comments"]["Row"];

/**
 * Sets up a Supabase Realtime subscription for new top-level comments on a project.
 * Calls `onNewComment` whenever another user posts a new comment.
 *
 * NOTE: Requires the `anon_select_comments` RLS policy from
 * supabase/migrations/003_anon_read_policies.sql to be applied.
 * Without it, the subscription silently receives no events.
 */
export function useComments(
  projectId: string | null,
  onNewComment: (comment: CommentRow) => void
) {
  // Stable ref so we can call the latest callback without re-subscribing
  const callbackRef = useRef(onNewComment);
  callbackRef.current = onNewComment;

  useEffect(() => {
    if (!projectId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`comments:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const comment = payload.new as CommentRow;
          // Only surface top-level pins (parent_id = null)
          if (!comment.parent_id) {
            callbackRef.current(comment);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);
}
