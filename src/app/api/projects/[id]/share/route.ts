import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type ShareResponse = { token: string } | { error: string };

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/projects/[id]/share — create or return the existing share token for a project. */
export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json<ShareResponse>(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ShareResponse>(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Verify project ownership
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json<ShareResponse>(
      { error: "Project not found" },
      { status: 404 }
    );
  }

  // Return existing token if one already exists
  const { data: existing } = await supabase
    .from("share_tokens")
    .select("token")
    .eq("project_id", id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json<ShareResponse>({ token: existing.token });
  }

  // Create a new share token
  const { data: created, error: insertError } = await supabase
    .from("share_tokens")
    .insert({ project_id: id })
    .select("token")
    .single();

  if (insertError || !created) {
    return NextResponse.json<ShareResponse>(
      { error: insertError?.message ?? "Failed to create share token" },
      { status: 500 }
    );
  }

  return NextResponse.json<ShareResponse>({ token: created.token }, { status: 201 });
}
