"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { WgyButton } from "@/components/ui/wgy-button";

// Redeems an admin setup link. The token in the query string is the only
// credential — the account has no usable password until this form is
// submitted, so the page is deliberately reachable without a session.

const inputStyle = (invalid: boolean): React.CSSProperties => ({
  background: "var(--surface)",
  borderRadius: "8px",
  border: `1px solid ${invalid ? "var(--error)" : "var(--border)"}`,
  height: "48px",
  padding: "0 16px",
  color: "var(--text)",
  fontSize: "14px",
  fontWeight: 500,
  caretColor: "var(--accent)",
});

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: "var(--accent)",
  marginBottom: "6px",
};

function SetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setChecking(false); setValid(false); return; }
    fetch(`/api/account/set-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => setValid(!!d.valid))
      .catch(() => setValid(false))
      .finally(() => setChecking(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setSaving(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/sign-in"), 2500);
    } catch {
      setError("Network error — please try again.");
      setSaving(false);
    }
  }

  const heading = (main: string, accent: string, sub: string) => (
    <>
      <h1
        className="font-montserrat text-center"
        style={{ fontSize: "28px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.01em", color: "var(--text)", marginTop: "32px" }}
      >
        {main} <em className="font-accent" style={{ textTransform: "none" }}>{accent}</em>
      </h1>
      <p
        className="font-montserrat text-center"
        style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", marginTop: "6px", padding: "0 24px", lineHeight: 1.5 }}
      >
        {sub}
      </p>
    </>
  );

  if (checking) {
    return heading("One", "moment", "Checking your setup link…");
  }

  if (!valid) {
    return (
      <>
        {heading(
          "Link",
          "expired",
          "This setup link is invalid, has already been used, or has expired. Ask whoever invited you to send a new one.",
        )}
        <div style={{ padding: "0 24px", marginTop: "28px" }}>
          <WgyButton onClick={() => router.push("/sign-in")} style={{ width: "100%" }}>
            Go to sign in
          </WgyButton>
        </div>
      </>
    );
  }

  if (done) {
    return heading("You're", "all set", "Password saved. Taking you to sign in…");
  }

  return (
    <>
      {/* Wording stays account-neutral: this page now serves both invited
          admins and reinstated members. */}
      {heading("Set your", "password", "Choose a password for your WGY account.")}

      <form onSubmit={handleSubmit} className="flex flex-col" style={{ padding: "0 24px", marginTop: "32px", gap: "14px" }}>
        <div className="flex flex-col">
          <label className="font-montserrat uppercase" style={labelStyle}>New Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className="w-full font-montserrat outline-none transition-colors"
              disabled={saving}
              style={{ ...inputStyle(!!error && password.length < 8), padding: "0 44px 0 16px" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col">
          <label className="font-montserrat uppercase" style={labelStyle}>Confirm Password</label>
          <input
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            className="font-montserrat outline-none transition-colors"
            disabled={saving}
            style={inputStyle(!!error && password !== confirm)}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {error && (
          <p className="font-montserrat" style={{ fontSize: "12px", fontWeight: 500, color: "var(--error)" }}>
            {error}
          </p>
        )}

        <WgyButton type="submit" disabled={saving} style={{ width: "100%", marginTop: "8px" }}>
          {saving ? "Saving..." : "Set Password"}
        </WgyButton>
      </form>
    </>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", maxWidth: "390px", margin: "0 auto" }}>
      <div className="flex justify-center" style={{ marginTop: "48px" }}>
        <span className="wgy-logo" role="img" aria-label="WGY" style={{ height: "40px", width: "96px", display: "block" }} />
      </div>
      {/* useSearchParams needs a Suspense boundary to prerender */}
      <Suspense fallback={null}>
        <SetPasswordForm />
      </Suspense>
    </div>
  );
}
