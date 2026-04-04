"use client";

import { useRef, useState } from "react";
import type { ProjectsPostResponse } from "@/app/api/projects/route";
import type { UploadResponse } from "@/app/api/projects/upload/route";

type ProjectType = "url" | "image" | "pdf";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_FILE_SIZE_MB = 20;

/** Create project wizard — lets owners create a project by URL, image, or PDF. */
export default function NewProjectPage() {
  const [type, setType] = useState<ProjectType>("url");
  const [name, setName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Validates and sets the selected image file. */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setImageFile(null);
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Please upload a PNG, JPG, or WebP image.");
      setImageFile(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_FILE_SIZE_MB} MB.`);
      setImageFile(null);
      return;
    }
    setError(null);
    setImageFile(file);
  }

  /** Handles form submission — uploads image to Storage if needed, then creates the project. */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      let screenshotUrl: string | null = null;
      let storagePath: string | null = null;

      if (type === "image") {
        if (!imageFile) {
          setError("Please select an image file.");
          setSubmitting(false);
          return;
        }

        const fd = new FormData();
        fd.append("file", imageFile);

        const uploadRes = await fetch("/api/projects/upload", {
          method: "POST",
          body: fd,
        });

        const uploadJson: UploadResponse = await uploadRes.json();

        if (!uploadRes.ok || "error" in uploadJson) {
          setError("error" in uploadJson ? uploadJson.error : "Upload failed");
          setSubmitting(false);
          return;
        }

        screenshotUrl = uploadJson.publicUrl;
        storagePath = uploadJson.path;
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          source_url: type === "url" ? sourceUrl : storagePath,
          screenshot_url: screenshotUrl,
        }),
      });

      const json: ProjectsPostResponse = await res.json();

      if (!res.ok || "error" in json) {
        setError("error" in json ? json.error : "Failed to create project");
        setSubmitting(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Network error — please try again");
      setSubmitting(false);
    }
  }

  /** Returns true when the form is ready to submit. */
  function canSubmit() {
    if (submitting) return false;
    if (!name.trim()) return false;
    if (type === "url") return sourceUrl.trim().length > 0;
    if (type === "image") return imageFile !== null;
    return false; // pdf not yet implemented
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="bg-white border-b border-zinc-200 px-6 py-4">
        <a href="/dashboard" className="text-lg font-semibold text-zinc-900">
          FeedbackPin
        </a>
      </header>

      <main className="flex-1 flex items-start justify-center px-6 py-16">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-semibold text-zinc-900 mb-8">
            New project
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-700 mb-1"
              >
                Project name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My design review"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-zinc-700 mb-2">
                Project type
              </span>
              <div className="flex gap-2">
                {(["url", "image", "pdf"] as ProjectType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setType(t);
                      setError(null);
                    }}
                    className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      type === t
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400"
                    }`}
                  >
                    {t === "url" ? "URL" : t === "image" ? "Image" : "PDF"}
                  </button>
                ))}
              </div>
            </div>

            {type === "url" && (
              <div>
                <label
                  htmlFor="source_url"
                  className="block text-sm font-medium text-zinc-700 mb-1"
                >
                  URL to capture
                </label>
                <input
                  id="source_url"
                  type="url"
                  required
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            )}

            {type === "image" && (
              <div>
                <label
                  htmlFor="image_file"
                  className="block text-sm font-medium text-zinc-700 mb-1"
                >
                  Image file
                </label>
                <div
                  className={`rounded-lg border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors ${
                    imageFile
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-zinc-300 hover:border-zinc-400"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    id="image_file"
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                  {imageFile ? (
                    <p className="text-sm text-indigo-700 font-medium">
                      {imageFile.name}{" "}
                      <span className="text-indigo-500 font-normal">
                        ({(imageFile.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-zinc-700">
                        Click to upload an image
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        PNG, JPG, WebP — up to {MAX_FILE_SIZE_MB} MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {type === "pdf" && (
              <div className="rounded-lg border-2 border-dashed border-zinc-300 px-6 py-10 text-center">
                <p className="text-sm text-zinc-500">PDF upload coming soon.</p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit()}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Creating..." : "Create project"}
            </button>

            <a
              href="/dashboard"
              className="block text-center text-sm text-zinc-500 hover:text-zinc-700"
            >
              Cancel
            </a>
          </form>
        </div>
      </main>
    </div>
  );
}
