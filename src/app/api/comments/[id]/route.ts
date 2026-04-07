import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/types";

type CommentRow = Database["public"]["Tables"]["comments"]["Row"];
export type CommentPatchResponse = { comment: CommentRow } | { error: string };

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { resolved?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.resolved !== "boolean") {
    return NextResponse.json(
      { error: "resolved must be a boolean" },
      { status: 400 }
    );
  }

  // RLS owner_update_comments policy ensures only the project owner can update.
  const { data: updated, error: updateError } = await supabase
    .from("comments")
    .update({ resolved: body.resolved })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json(
      { error: "Comment not found or not authorized" },
      { status: 404 }
    );
  }

  return NextResponse.json({ comment: updated });
}

export async function DELETE() {}
