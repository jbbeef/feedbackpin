import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type UploadResponse = { publicUrl: string; path: string } | { error: string };

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/** POST /api/projects/upload — uploads an image to Supabase Storage and returns the public URL. */
export async function POST(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json<UploadResponse>(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<UploadResponse>(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json<UploadResponse>(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json<UploadResponse>(
      { error: "file field is required" },
      { status: 400 }
    );
  }

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return NextResponse.json<UploadResponse>(
      { error: "Only PNG, JPG, and WebP images are accepted" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json<UploadResponse>(
      { error: "File must be under 20 MB" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() ?? "png";
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Upload via Supabase Storage REST API using the service role key.
  // The service role key bypasses storage RLS when sent as the Authorization header.
  const uploadApiUrl = `${supabaseUrl}/storage/v1/object/project-uploads/${fileName}`;
  const uploadRes = await fetch(uploadApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": file.type,
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    const errBody = await uploadRes.text();
    return NextResponse.json<UploadResponse>(
      { error: `Storage upload failed: ${errBody}` },
      { status: 500 }
    );
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/project-uploads/${fileName}`;

  return NextResponse.json<UploadResponse>({
    publicUrl,
    path: fileName,
  });
}
