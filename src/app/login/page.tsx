"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Tab = "signin" | "signup";

const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Auth page — email/password sign in and sign up via Supabase Auth. */
export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  // createClient() throws if env vars are missing — only call when configured.
  const supabase = supabaseConfigured ? createClient() : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase is not configured. Add env vars to .env.local.");
      return;
    }
    setError(null);
    setLoading(true);

    if (tab === "signup") {
      const { error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signupError) {
        setError(signupError.message);
      } else {
        setSignupDone(true);
        // If email confirmation is disabled in Supabase, session is set immediately.
        // Attempt redirect; if it fails the confirmation message shows instead.
        const {
          data: { user },
        } = await supabase!.auth.getUser();
        if (user) {
          window.location.href = "/dashboard";
        }
      }
    } else {
      const { error: signinError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signinError) {
        setError(signinError.message);
      } else {
        // Full-page navigation ensures the auth cookie is sent with the next
        // server request — router.push() + refresh() has a race on Next.js 16.
        window.location.href = "/dashboard";
      }
    }

    setLoading(false);
  }

  if (signupDone) {
    return (
      <div className="flex min-h-full items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 mb-2">
            Check your email
          </h1>
          <p className="text-zinc-600">
            We sent a confirmation link to <strong>{email}</strong>. Click it to
            activate your account, then{" "}
            <button
              className="text-indigo-600 hover:underline"
              onClick={() => {
                setSignupDone(false);
                setTab("signin");
              }}
            >
              sign in
            </button>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-6">
          FeedbackPin
        </h1>

        {!supabaseConfigured && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            <strong>Setup required:</strong> Copy{" "}
            <code className="font-mono">.env.example</code> to{" "}
            <code className="font-mono">.env.local</code> and add your Supabase
            credentials.
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex border-b border-zinc-200 mb-6">
          <button
            type="button"
            onClick={() => setTab("signin")}
            className={`pb-2 pr-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "signin"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setTab("signup")}
            className={`pb-2 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "signup"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete={tab === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? "Please wait…"
              : tab === "signup"
              ? "Create account"
              : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
