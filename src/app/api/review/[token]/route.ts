import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

export type ReviewResponse = { project: ProjectRow } | { error: string };

type RouteContext = { params: Promise<{ token: string }> };

/** GET /api/review/[token] — return project data for a valid share token. No auth required. */
export async function GET(_request: Request, { params }: RouteContext) {
  const { token } = await params;

  let supabase;
  try {
    supabase = await createServiceClient();
  } catch {
    return NextResponse.json<ReviewResponse>(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  // Validate the share token
  const { data: tokenRow, error: tokenError } = await supabase
    .from("share_tokens")
    .select("project_id")
    .eq("token", token)
    .single();

  if (tokenError || !tokenRow) {
    return NextResponse.json<ReviewResponse>(
      { error: "Invalid or expired share link" },
      { status: 404 }
    );
  }

  // Fetch the project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", tokenRow.project_id)
    .single();

  if (projectError || !project) {
    return NextResponse.json<ReviewResponse>(
      { error: "Project not found" },
      { status: 404 }
    );
  }

  return NextResponse.json<ReviewResponse>({ project });
}
