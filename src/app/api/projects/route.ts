import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

export type ProjectsGetResponse =
  | { projects: ProjectRow[] }
  | { error: string };

export type ProjectsPostResponse = { project: ProjectRow } | { error: string };

/** GET /api/projects — list the authenticated owner's projects. */
export async function GET() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json<ProjectsGetResponse>(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ProjectsGetResponse>(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json<ProjectsGetResponse>(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ProjectsGetResponse>({ projects: data ?? [] });
}

/** POST /api/projects — create a new project for the authenticated owner. */
export async function POST(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json<ProjectsPostResponse>(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ProjectsPostResponse>(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: {
    name?: unknown;
    type?: unknown;
    source_url?: unknown;
    screenshot_url?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ProjectsPostResponse>(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { name, type, source_url, screenshot_url } = body;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json<ProjectsPostResponse>(
      { error: "name is required" },
      { status: 400 }
    );
  }

  if (type !== "url" && type !== "image" && type !== "pdf") {
    return NextResponse.json<ProjectsPostResponse>(
      { error: "type must be url, image, or pdf" },
      { status: 400 }
    );
  }

  if (type === "url") {
    if (typeof source_url !== "string" || source_url.trim().length === 0) {
      return NextResponse.json<ProjectsPostResponse>(
        { error: "source_url is required for url projects" },
        { status: 400 }
      );
    }
    try {
      new URL(source_url);
    } catch {
      return NextResponse.json<ProjectsPostResponse>(
        { error: "source_url must be a valid URL" },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      name: name.trim(),
      type,
      source_url: typeof source_url === "string" ? source_url.trim() : null,
      screenshot_url:
        typeof screenshot_url === "string" ? screenshot_url.trim() : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json<ProjectsPostResponse>(
      { error: error.message },
      { status: 500 }
    );
  }

  // For URL projects, trigger screenshot capture asynchronously (fire-and-forget).
  // The worker uploads the screenshot and updates projects.screenshot_url independently.
  // SCREENSHOT_WORKER_URL must be set in .env.local (local dev) or environment (Railway).
  if (type === "url" && data && process.env.SCREENSHOT_WORKER_URL) {
    const workerUrl = process.env.SCREENSHOT_WORKER_URL;
    const projectId = data.id;
    const captureUrl = typeof source_url === "string" ? source_url.trim() : "";
    // Fire-and-forget: do not await; do not let errors block the response
    fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, sourceUrl: captureUrl }),
    }).catch(() => {
      // Worker unavailable — screenshot_url remains null; not a fatal error
    });
  }

  return NextResponse.json<ProjectsPostResponse>(
    { project: data },
    { status: 201 }
  );
}
