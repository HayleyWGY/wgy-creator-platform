"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import { WgyButton } from "@/components/ui/wgy-button";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(
        // 'rate-limited' comes from the per-IP throttle in lib/auth.ts. Without
        // this case a throttled member would be told their password is wrong.
        //
        // There is deliberately no "your account is locked" case any more.
        // Accounts are no longer locked — repeated failures slow the response
        // instead — and the old message doubled as an enumeration oracle: only
        // a REGISTERED address could ever produce it, so five wrong guesses
        // confirmed whether someone was a member. Wrong password and unknown
        // address now give the identical message below.
        result.error === "rate-limited"
          ? "Too many sign-in attempts from this network. Please wait a few minutes and try again."
          : "Invalid email or password. Please try again."
      );
      setLoading(false);
      return;
    }

    // Middleware will redirect admin → /admin/dashboard, creator → /home
    router.push("/home");
  }

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

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)", maxWidth: "390px", margin: "0 auto" }}
    >
      {/* Logo (theme-aware via CSS mask) */}
      <div className="flex justify-center" style={{ marginTop: "48px" }}>
        <span className="wgy-logo" role="img" aria-label="WGY" style={{ height: "40px", width: "96px", display: "block" }} />
      </div>

      {/* Heading — Montserrat 800 with Playfair-italic accent */}
      <h1
        className="font-montserrat text-center"
        style={{ fontSize: "28px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.01em", color: "var(--text)", marginTop: "32px" }}
      >
        Welcome <em className="font-accent" style={{ textTransform: "none" }}>back</em>
      </h1>
      <p
        className="font-montserrat text-center"
        style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", marginTop: "6px" }}
      >
        Sign in to your WGY account
      </p>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col"
        style={{ padding: "0 24px", marginTop: "32px", gap: "14px" }}
      >
        {/* Email */}
        <div className="flex flex-col">
          <label
            className="font-montserrat uppercase"
            style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent)", marginBottom: "6px" }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="font-montserrat outline-none transition-colors"
            disabled={loading}
            style={inputStyle(!!error && !email)}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {/* Password */}
        <div className="flex flex-col">
          <label
            className="font-montserrat uppercase"
            style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent)", marginBottom: "6px" }}
          >
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full font-montserrat outline-none transition-colors"
              disabled={loading}
              style={{ ...inputStyle(!!error && !password), padding: "0 44px 0 16px" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showPassword
                ? <EyeOff size={16} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />
                : <Eye size={16} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="font-montserrat" style={{ fontSize: "11px", fontWeight: 500, color: "var(--error)", marginTop: "-4px" }}>
            {error}
          </p>
        )}

        {/* Forgot password — interim mailto until the Resend reset flow
            lands (deferred to end of the security list). Was a 404. */}
        <div className="flex justify-end" style={{ marginTop: "-6px" }}>
          <a
            href="mailto:support@wegotyouagency.com?subject=Password%20reset%20request"
            className="font-montserrat"
            style={{ fontSize: "12px", fontWeight: 500, color: "var(--accent)", textDecoration: "none" }}
          >
            Forgot password?
          </a>
        </div>

        {/* Submit */}
        <WgyButton
          type="submit"
          variant="primary"
          fullWidth
          disabled={loading}
          style={{ marginTop: "8px", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </WgyButton>
      </form>

      {/* Not a member */}
      <div className="flex flex-col items-center" style={{ marginTop: "24px", gap: "2px" }}>
        <span className="font-montserrat" style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}>
          Not a member yet?
        </span>
        <span className="font-montserrat" style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent)" }}>
          Visit wegotyouagency.com to join
        </span>
      </div>

      <div className="flex-1" />

      {/* Legal links — hosted on the main WGY site */}
      <div className="flex items-center justify-center gap-4 pb-10">
        <a
          href="https://www.wegotyouagency.com/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-montserrat"
          style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)", textDecoration: "none" }}
        >
          Privacy Policy
        </a>
        <a
          href="https://www.wegotyouagency.com/terms-conditions"
          target="_blank"
          rel="noopener noreferrer"
          className="font-montserrat"
          style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)", textDecoration: "none" }}
        >
          Terms &amp; Conditions
        </a>
      </div>

      <style>{`input::placeholder { color: var(--text-muted); }`}</style>
    </div>
  );
}
