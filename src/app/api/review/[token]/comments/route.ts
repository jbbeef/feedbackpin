import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type CommentRow = Database["public"]["Tables"]["comments"]["Row"];

export type CommentsGetResponse = { comments: CommentRow[] } | { error: string };
export type CommentsPostResponse = { comment: CommentRow } | { error: string };

type RouteContext = { params: Promise<{ token: string }> };

/** Resolve the project_id for a share token. Returns null if invalid. */
async function resolveProjectId(token: string): Promise<string | null> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("share_tokens")
    .select("project_id")
    .eq("token", token)
    .single();
  return data?.project_id ?? null;
}

/** GET /api/review/[token]/comments — list top-level comments for the project. No auth required. */
export async function GET(_request: Request, { params }: RouteContext) {
  const { token } = await params;

  let projectId: string | null;
  try {
    projectId = await resolveProjectId(token);
  } catch {
    return NextResponse.json<CommentsGetResponse>(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  if (!projectId) {
    return NextResponse.json<CommentsGetResponse>(
      { error: "Invalid share link" },
      { status: 404 }
    );
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("project_id", projectId)
    .is("parent_id", null)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json<CommentsGetResponse>(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json<CommentsGetResponse>({ comments: data ?? [] });
}

/** POST /api/review/[token]/comments — create a comment. No auth required; validated by share token. */
export async function POST(request: Request, { params }: RouteContext) {
  const { token } = await params;

  let projectId: string | null;
  try {
    projectId = await resolveProjectId(token);
  } catch {
    return NextResponse.json<CommentsPostResponse>(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  if (!projectId) {
    return NextResponse.json<CommentsPostResponse>(
      { error: "Invalid share link" },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<CommentsPostResponse>(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const b = body as Record<string, unknown>;
  const x_percent = b.x_percent as number;
  const y_percent = b.y_percent as number;
  const commentBody = b.body as string;
  const author_name = b.author_name as string;

  if (
    typeof x_percent !== "number" ||
    x_percent < 0 ||
    x_percent > 100 ||
    typeof y_percent !== "number" ||
    y_percent < 0 ||
    y_percent > 100 ||
    typeof commentBody !== "string" ||
    commentBody.trim().length === 0 ||
    typeof author_name !== "string" ||
    author_name.trim().length === 0
  ) {
    return NextResponse.json<CommentsPostResponse>(
      { error: "x_percent, y_percent, body, and author_name are required" },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({
      project_id: projectId,
      x_percent,
      y_percent,
      body: commentBody.trim(),
      author_name: author_name.trim(),
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json<CommentsPostResponse>(
      { error: error?.message ?? "Failed to create comment" },
      { status: 500 }
    );
  }

  return NextResponse.json<CommentsPostResponse>({ comment: data }, { status: 201 });
}
