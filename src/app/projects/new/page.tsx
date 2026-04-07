"use client";

import { useRef, useState } from "react";
import type { ProjectsPostResponse } from "@/app/api/projects/route";
import type { UploadResponse } from "@/app/api/projects/upload/route";

type ProjectType = "url" | "image" | "pdf";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_FILE_SIZE_MB = 20;

/** Human-readable label for the type selector buttons. */
const typeLabels: Record<ProjectType, string> = {
  url: "A website or app",
  image: "A design file",
  pdf: "A document",
};

/** Create feedback request wizard — lets owners create a request by URL, image, or PDF. */
export default function NewProjectPage() {
  const [type, setType] = useState<ProjectType>("url");
  const [name, setName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) { setImageFile(null); return; }
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
        const uploadRes = await fetch("/api/projects/upload", { method: "POST", body: fd });
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
        setError("error" in json ? json.error : "Failed to create feedback request");
        setSubmitting(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Network error — please try again");
      setSubmitting(false);
    }
  }

  function canSubmit() {
    if (submitting) return false;
    if (!name.trim()) return false;
    if (type === "url") return sourceUrl.trim().length > 0;
    if (type === "image") return imageFile !== null;
    return false;
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--color-base)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 15,
    color: "var(--color-text-primary)",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 150ms ease-out, box-shadow 150ms ease-out",
  };

  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--color-accent)";
    e.target.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)";
  };

  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--color-border)";
    e.target.style.boxShadow = "none";
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-base)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header
        style={{
          background: "var(--color-base)",
          borderBottom: "1px solid var(--color-border)",
          padding: "14px 32px",
        }}
      >
        <a
          href="/dashboard"
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "var(--color-accent)",
            textDecoration: "none",
            letterSpacing: "-0.01em",
          }}
        >
          FeedbackPin
        </a>
      </header>

      {/* Main */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "56px 24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            animation: "panel-enter 200ms ease-out both",
          }}
        >
          {/* Opening question — large, friendly */}
          <h1
            style={{
              fontSize: 26,
              fontWeight: 500,
              color: "var(--color-text-primary)",
              margin: "0 0 8px",
              letterSpacing: "-0.02em",
              lineHeight: 1.3,
            }}
          >
            What are you reviewing?
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--color-text-tertiary)",
              margin: "0 0 36px",
              lineHeight: 1.6,
            }}
          >
            Give it a name and share a link with your reviewers — that&apos;s it.
          </p>

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 24 }}
          >
            {/* Name field — prominent, no separate label (heading is the label) */}
            <div>
              <label
                htmlFor="name"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  marginBottom: 8,
                }}
              >
                Give it a name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Homepage redesign"
                style={inputStyle}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>

            {/* Type selector — conversational */}
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  marginBottom: 8,
                }}
              >
                What are you sharing?
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                {(["url", "image", "pdf"] as ProjectType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setType(t); setError(null); }}
                    style={{
                      flex: 1,
                      borderRadius: 8,
                      border: `1px solid ${type === t ? "var(--color-accent)" : "var(--color-border)"}`,
                      background: type === t ? "var(--color-accent-subtle)" : "var(--color-surface)",
                      color: type === t ? "var(--color-accent)" : "var(--color-text-secondary)",
                      fontSize: 13,
                      fontWeight: 500,
                      padding: "10px 8px",
                      cursor: "pointer",
                      transition: "all 150ms ease-out",
                      lineHeight: 1.3,
                    }}
                  >
                    {typeLabels[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* URL input */}
            {type === "url" && (
              <div>
                <label
                  htmlFor="source_url"
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--color-text-secondary)",
                    marginBottom: 8,
                  }}
                >
                  Page or site URL
                </label>
                <input
                  id="source_url"
                  type="url"
                  required
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="Paste your page URL here"
                  style={inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
              </div>
            )}

            {/* Image upload */}
            {type === "image" && (
              <div>
                <label
                  htmlFor="image_file"
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--color-text-secondary)",
                    marginBottom: 8,
                  }}
                >
                  Upload your design
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    borderRadius: 12,
                    border: `2px dashed ${imageFile ? "var(--color-accent)" : "var(--color-border)"}`,
                    background: imageFile ? "var(--color-accent-subtle)" : "var(--color-surface)",
                    padding: "32px 24px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 150ms ease-out",
                  }}
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
                    <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-accent)", margin: 0 }}>
                      {imageFile.name}{" "}
                      <span style={{ fontWeight: 400, color: "var(--color-text-tertiary)" }}>
                        ({(imageFile.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </p>
                  ) : (
                    <>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 4px" }}>
                        Click to upload an image
                      </p>
                      <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: 0 }}>
                        PNG, JPG, WebP — up to {MAX_FILE_SIZE_MB} MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* PDF placeholder */}
            {type === "pdf" && (
              <div
                style={{
                  borderRadius: 12,
                  border: "2px dashed var(--color-border)",
                  background: "var(--color-surface)",
                  padding: "32px 24px",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 14, color: "var(--color-text-tertiary)", margin: 0 }}>
                  PDF upload coming soon.
                </p>
              </div>
            )}

            {error && (
              <p
                style={{ fontSize: 13, color: "var(--color-danger)", margin: 0 }}
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit()}
              style={{
                background: "var(--color-accent)",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 500,
                cursor: canSubmit() ? "pointer" : "not-allowed",
                opacity: canSubmit() ? 1 : 0.45,
                transition: "background 150ms ease-out, scale 150ms ease-out",
                marginTop: 4,
              }}
              onMouseEnter={(e) => {
                if (canSubmit()) e.currentTarget.style.background = "var(--color-accent-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--color-accent)";
              }}
              className="active:[scale:0.97]"
            >
              {submitting ? "Starting…" : "Start a feedback request"}
            </button>

            <a
              href="/dashboard"
              style={{
                display: "block",
                textAlign: "center",
                fontSize: 13,
                color: "var(--color-text-tertiary)",
                textDecoration: "none",
                marginTop: -8,
                transition: "color 150ms ease-out",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-tertiary)")}
            >
              Cancel
            </a>
          </form>
        </div>
      </main>
    </div>
  );
}
