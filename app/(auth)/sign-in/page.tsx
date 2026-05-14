"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";

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
      setError("Invalid email or password. Please try again.");
      setLoading(false);
      return;
    }

    // Middleware will redirect admin → /admin/dashboard, creator → /home
    router.push("/home");
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#222222", maxWidth: "390px", margin: "0 auto" }}
    >
      {/* Logo */}
      <div className="flex justify-center" style={{ marginTop: "48px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/wgy-logo-white.png"
          alt="WGY"
          style={{ height: "40px", width: "auto" }}
        />
      </div>

      {/* Heading */}
      <h1
        className="font-playfair italic font-normal text-white text-center"
        style={{ fontSize: "28px", marginTop: "32px" }}
      >
        Welcome back
      </h1>
      <p
        className="font-montserrat font-normal text-center"
        style={{ fontSize: "13px", color: "#706b6b", marginTop: "6px" }}
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
            className="font-montserrat font-medium uppercase"
            style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#e4dcd1", marginBottom: "6px" }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="font-montserrat font-normal outline-none transition-colors"
            disabled={loading}
            style={{
              background: "#2a2a2a",
              borderRadius: "8px",
              border: `1px solid ${error && !email ? "#C0392B" : "rgba(255,255,255,0.08)"}`,
              height: "48px",
              padding: "0 16px",
              color: "#ffffff",
              fontSize: "14px",
              caretColor: "#e4dcd1",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#e4dcd1")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
          />
        </div>

        {/* Password */}
        <div className="flex flex-col">
          <label
            className="font-montserrat font-medium uppercase"
            style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#e4dcd1", marginBottom: "6px" }}
          >
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full font-montserrat font-normal outline-none transition-colors"
              disabled={loading}
              style={{
                background: "#2a2a2a",
                borderRadius: "8px",
                border: `1px solid ${error && !password ? "#C0392B" : "rgba(255,255,255,0.08)"}`,
                height: "48px",
                padding: "0 44px 0 16px",
                color: "#ffffff",
                fontSize: "14px",
                caretColor: "#e4dcd1",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#e4dcd1")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showPassword
                ? <EyeOff size={16} color="#706b6b" strokeWidth={1.5} />
                : <Eye size={16} color="#706b6b" strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#C0392B", marginTop: "-4px" }}>
            {error}
          </p>
        )}

        {/* Forgot password */}
        <div className="flex justify-end" style={{ marginTop: "-6px" }}>
          <Link
            href="/forgot-password"
            className="font-montserrat font-normal"
            style={{ fontSize: "12px", color: "#e4dcd1", textDecoration: "none" }}
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full font-montserrat font-semibold transition-opacity active:opacity-80"
          style={{
            height: "48px",
            borderRadius: "8px",
            background: "#e4dcd1",
            color: "#222222",
            fontSize: "14px",
            marginTop: "8px",
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {/* Not a member */}
      <div className="flex flex-col items-center" style={{ marginTop: "24px", gap: "2px" }}>
        <span className="font-montserrat font-normal" style={{ fontSize: "13px", color: "#706b6b" }}>
          Not a member yet?
        </span>
        <span className="font-montserrat font-semibold" style={{ fontSize: "13px", color: "#e4dcd1" }}>
          Visit wegotyouagency.com to join
        </span>
      </div>

      <div className="flex-1" />

      {/* Legal links */}
      <div className="flex items-center justify-center gap-4 pb-10">
        <Link href="/privacy" className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b", textDecoration: "none" }}>
          Privacy Policy
        </Link>
        <Link href="/terms" className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b", textDecoration: "none" }}>
          Terms &amp; Conditions
        </Link>
      </div>

      <style>{`input::placeholder { color: #706b6b; }`}</style>
    </div>
  );
}
