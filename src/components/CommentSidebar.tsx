import type { Database } from "@/lib/supabase/types";

type CommentRow = Database["public"]["Tables"]["comments"]["Row"];

interface Props {
  comments: CommentRow[];
}

/** Sidebar listing all top-level comment pins in order. */
export default function CommentSidebar({ comments }: Props) {
  if (comments.length === 0) {
    return (
      <aside className="w-72 shrink-0 bg-white border-l border-zinc-200 flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-700">Comments</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-xs text-zinc-400 text-center">
            Click anywhere on the canvas to leave a comment
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-72 shrink-0 bg-white border-l border-zinc-200 flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-zinc-100 sticky top-0 bg-white">
        <h2 className="text-sm font-semibold text-zinc-700">
          Comments{" "}
          <span className="text-zinc-400 font-normal">({comments.length})</span>
        </h2>
      </div>
      <ul className="divide-y divide-zinc-100">
        {comments.map((comment, index) => (
          <li
            key={comment.id}
            className="px-4 py-3 hover:bg-zinc-50 transition-colors"
            data-testid={`comment-item-${index + 1}`}
          >
            <div className="flex items-start gap-2">
              {/* Pin number badge */}
              <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-700 truncate">
                  {comment.author_name}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5 break-words">
                  {comment.body}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
