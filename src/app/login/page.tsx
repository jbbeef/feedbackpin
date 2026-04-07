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
      const { error: signupError } = await supabase.auth.signUp({ email, password });
      if (signupError) {
        setError(signupError.message);
      } else {
        setSignupDone(true);
        const { data: { user } } = await supabase!.auth.getUser();
        if (user) window.location.href = "/dashboard";
      }
    } else {
      const { error: signinError } = await supabase.auth.signInWithPassword({ email, password });
      if (signinError) {
        setError(signinError.message);
      } else {
        window.location.href = "/dashboard";
      }
    }

    setLoading(false);
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

  if (signupDone) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--color-base)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 400,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: 32,
            textAlign: "center",
            animation: "panel-enter 200ms ease-out both",
          }}
        >
          <p
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: "var(--color-text-primary)",
              margin: "0 0 8px",
            }}
          >
            Check your email
          </p>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 20px" }}>
            We sent a confirmation link to{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>{email}</strong>.
            Click it to activate your account, then{" "}
            <button
              style={{
                color: "var(--color-accent)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "inherit",
                fontWeight: 500,
                padding: 0,
              }}
              onClick={() => { setSignupDone(false); setTab("signin"); }}
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
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-base)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          animation: "panel-enter 200ms ease-out both",
        }}
      >
        {/* Wordmark */}
        <p
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: "var(--color-accent)",
            margin: "0 0 32px",
            letterSpacing: "-0.01em",
          }}
        >
          FeedbackPin
        </p>

        {/* Card */}
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: 28,
          }}
        >
          {!supabaseConfigured && (
            <div
              style={{
                marginBottom: 20,
                borderRadius: 8,
                background: "var(--color-accent-subtle)",
                border: "1px solid var(--color-accent)",
                padding: "10px 14px",
                fontSize: 13,
                color: "var(--color-text-secondary)",
              }}
            >
              <strong style={{ color: "var(--color-text-primary)" }}>Setup required:</strong>{" "}
              copy <code>.env.example</code> to <code>.env.local</code> and add your Supabase credentials.
            </div>
          )}

          {/* Tab switcher */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--color-border)",
              marginBottom: 24,
            }}
          >
            {(["signin", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(null); }}
                style={{
                  paddingBottom: 10,
                  paddingRight: t === "signin" ? 16 : 0,
                  paddingLeft: t === "signup" ? 16 : 0,
                  fontSize: 14,
                  fontWeight: 500,
                  background: "none",
                  border: "none",
                  borderBottom: tab === t ? "2px solid var(--color-accent)" : "2px solid transparent",
                  marginBottom: -1,
                  cursor: "pointer",
                  color: tab === t ? "var(--color-accent)" : "var(--color-text-tertiary)",
                  transition: "color 150ms ease-out",
                }}
              >
                {t === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  marginBottom: 6,
                }}
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
                style={inputStyle}
                placeholder="you@example.com"
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  marginBottom: 6,
                }}
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
                style={inputStyle}
                placeholder="••••••••"
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>

            {error && (
              // className="text-red-600" is kept as a test selector hook;
              // inline style applies the design system token visually.
              <p
                className="text-red-600"
                style={{
                  fontSize: 13,
                  color: "var(--color-danger)",
                  background: "color-mix(in srgb, var(--color-danger) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  margin: 0,
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "var(--color-accent)",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "background 150ms ease-out, scale 150ms ease-out",
                marginTop: 4,
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = "var(--color-accent-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--color-accent)";
              }}
              className="active:[scale:0.97]"
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
    </div>
  );
}
