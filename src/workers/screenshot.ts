/**
 * Screenshot worker — runs as a standalone HTTP server on Railway (not Vercel).
 * Accepts POST / with JSON { projectId, sourceUrl }, captures a screenshot,
 * uploads it to Supabase Storage, and updates projects.screenshot_url.
 *
 * Start locally: node --experimental-strip-types src/workers/screenshot.ts
 * Environment vars required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: SCREENSHOT_WORKER_PORT (default 3001)
 */

import http from "http";
import { readFileSync } from "fs";
import path from "path";
import { chromium } from "playwright";

/** Loads .env.local into process.env (skips keys already set in the environment). */
function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  try {
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local not found — env vars must already be set (e.g. Railway)
  }
}

/** Captures a viewport screenshot of the given URL and returns it as a PNG Buffer. */
export async function captureScreenshot(url: string): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  } catch {
    // networkidle timed out — fall back to load event and capture what we have
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
  }
  const buffer = await page.screenshot({ fullPage: false });
  await browser.close();
  return Buffer.from(buffer);
}

/**
 * Captures a screenshot, uploads to Supabase Storage, and updates the project row.
 * Uses the service role key via REST API directly (bypasses storage RLS).
 */
async function processScreenshotJob(
  projectId: string,
  sourceUrl: string
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    );
  }

  const imgBuffer = await captureScreenshot(sourceUrl);
  const fileName = `screenshots/${projectId}.png`;

  // Upload to project-uploads bucket via Storage REST API (service role bypasses RLS)
  const uploadRes = await fetch(
    `${supabaseUrl}/storage/v1/object/project-uploads/${fileName}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "image/png",
      },
      body: Buffer.from(imgBuffer) as unknown as BodyInit,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Storage upload failed: ${errText}`);
  }

  const screenshotUrl = `${supabaseUrl}/storage/v1/object/public/project-uploads/${fileName}`;

  // Update projects.screenshot_url via PostgREST with service role key
  const updateRes = await fetch(
    `${supabaseUrl}/rest/v1/projects?id=eq.${projectId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ screenshot_url: screenshotUrl }),
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`DB update failed: ${errText}`);
  }
}

// ── Standalone HTTP server (Railway deployment / local dev) ──────────────────
// Detect if this file is the direct entry point
const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith("screenshot.ts") ||
    process.argv[1].endsWith("screenshot.js"));

if (isMain) {
  // Load env vars from .env.local in non-production environments
  if (process.env.NODE_ENV !== "production") {
    loadEnvLocal();
  }

  const PORT = parseInt(process.env.SCREENSHOT_WORKER_PORT ?? "3001", 10);

  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method !== "POST") {
      res.writeHead(405);
      res.end("Method Not Allowed");
      return;
    }

    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      let projectId: string;
      let sourceUrl: string;

      try {
        const parsed = JSON.parse(body) as unknown;
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          typeof (parsed as Record<string, unknown>).projectId !== "string" ||
          typeof (parsed as Record<string, unknown>).sourceUrl !== "string"
        ) {
          throw new Error("Invalid body");
        }
        projectId = (parsed as Record<string, string>).projectId;
        sourceUrl = (parsed as Record<string, string>).sourceUrl;
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ error: "Body must be { projectId, sourceUrl }" })
        );
        return;
      }

      processScreenshotJob(projectId, sourceUrl)
        .then(() => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: message }));
        });
    });
  });

  server.listen(PORT, () => {
    console.log(`Screenshot worker listening on http://localhost:${PORT}`);
  });
}
