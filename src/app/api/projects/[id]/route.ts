import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

export type ProjectGetResponse = { project: ProjectRow } | { error: string };
export type ProjectPatchResponse = { project: ProjectRow } | { error: string };
export type ProjectDeleteResponse = { ok: true } | { error: string };

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/projects/[id] — return a single project owned by the authenticated user. */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json<ProjectGetResponse>(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ProjectGetResponse>(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json<ProjectGetResponse>(
      { error: error.message },
      { status }
    );
  }

  return NextResponse.json<ProjectGetResponse>({ project: data });
}

/** PATCH /api/projects/[id] — update fields on a project owned by the authenticated user. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json<ProjectPatchResponse>(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ProjectPatchResponse>(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ProjectPatchResponse>(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Only allow safe fields to be patched
  const allowed: (keyof Database["public"]["Tables"]["projects"]["Update"])[] =
    ["name", "screenshot_url"];
  const patch: Database["public"]["Tables"]["projects"]["Update"] = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key] as never;
  }

  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select()
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json<ProjectPatchResponse>(
      { error: error.message },
      { status }
    );
  }

  return NextResponse.json<ProjectPatchResponse>({ project: data });
}

/** DELETE /api/projects/[id] — delete a project owned by the authenticated user. */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json<ProjectDeleteResponse>(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ProjectDeleteResponse>(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    return NextResponse.json<ProjectDeleteResponse>(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ProjectDeleteResponse>({ ok: true });
}
