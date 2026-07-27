"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { WgyButton } from "@/components/ui/wgy-button";

const MAX_BIO = 160;

export default function ProfileSetupPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();

  // Mark onboarding done (durable, server-side), flip the session token so the
  // middleware gate stops redirecting, THEN leave for the app. The order
  // matters: navigating before the token flips would bounce straight back here.
  async function finishOnboarding() {
    await fetch("/api/onboarding/complete", { method: "POST" }).catch(() => {});
    await updateSession({ onboarded: true }).catch(() => {});
    router.push("/home");
  }

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [errors, setErrors] = useState({ firstName: false, lastName: false });

  // Local object-URL for instant preview; the saved server URL is separate.
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // This page needs a session — every save hits an authenticated endpoint.
  // Prefill from the existing account so a member isn't retyping the name
  // they were created with; bounce to sign-in if there's no session.
  useEffect(() => {
    let active = true;
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (!active || !data.creator) return;
        const c = data.creator;
        setFirstName(c.firstName ?? "");
        setLastName(c.lastName ?? "");
        setBio(c.bio ?? "");
        setInstagram(c.instagramHandle ?? "");
        setTiktok(c.tiktokHandle ?? "");
        setYoutube(c.youtubeUrl ?? "");
        setAvatarUrl(c.profileImageUrl ?? null);
        setAvatarPreview(c.profileImageUrl ?? null);
      })
      .catch(() => {
        if (active) router.replace("/sign-in");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show the local preview immediately, then upload for real. The old code
    // only ever did this preview and never uploaded, so the photo was lost.
    setAvatarPreview(URL.createObjectURL(file));
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.url) {
        setAvatarUrl(data.url);
      } else {
        setError(data.error || "Photo upload failed. Please try again.");
        setAvatarPreview(avatarUrl); // revert to whatever was saved before
      }
    } catch {
      setError("Photo upload failed. Please check your connection.");
      setAvatarPreview(avatarUrl);
    } finally {
      setUploading(false);
    }
  }

  async function handleContinue() {
    const newErrors = {
      firstName: !firstName.trim(),
      lastName: !lastName.trim(),
    };
    setErrors(newErrors);
    if (newErrors.firstName || newErrors.lastName) return;
    if (saving || uploading) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          bio: bio.trim() || null,
          instagramHandle: instagram.trim() || null,
          tiktokHandle: tiktok.trim() || null,
          youtubeUrl: youtube.trim() || null,
          profileImageUrl: avatarUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Couldn't save your profile. Please try again.");
        return;
      }
      await finishOnboarding();
    } catch {
      setError("Couldn't save your profile. Please check your connection.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    background: "var(--surface)",
    borderRadius: "8px",
    border: `1px solid ${hasError ? "var(--error)" : "var(--border)"}`,
    height: "48px",
    padding: "0 16px",
    color: "var(--text)",
    fontSize: "14px",
    fontWeight: 500,
    caretColor: "var(--accent)",
    width: "100%",
    outline: "none",
  });

  const labelStyle: React.CSSProperties = { fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent)" };

  // Hold the render until the session/prefill check resolves, so an
  // unauthenticated visitor is redirected rather than shown a blank form.
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)", maxWidth: "390px", margin: "0 auto" }}
      >
        <span className="wgy-logo" role="img" aria-label="WGY" style={{ height: "40px", width: "96px", display: "block", opacity: 0.5 }} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)", maxWidth: "390px", margin: "0 auto" }}
    >
      {/* Single-step onboarding — the multi-dot progress indicator was
          removed because the "step 2 / step 3" pages it promised were never
          built. Continue and Skip both land on /home. */}
      <div className="pt-5" />

      {/* Logo (theme-aware via CSS mask) */}
      <div className="flex justify-center" style={{ marginTop: "16px" }}>
        <span className="wgy-logo" role="img" aria-label="WGY" style={{ height: "40px", width: "96px", display: "block" }} />
      </div>

      {/* Heading */}
      <h1
        className="font-montserrat text-center"
        style={{ fontSize: "24px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.01em", color: "var(--text)", marginTop: "24px" }}
      >
        Set up your <em className="font-accent" style={{ textTransform: "none" }}>profile</em>
      </h1>
      <p
        className="font-montserrat text-center"
        style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", marginTop: "6px", padding: "0 24px" }}
      >
        This helps brands find the right creators for their campaigns
      </p>

      {/* Avatar upload */}
      <div className="flex flex-col items-center" style={{ marginTop: "24px" }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Add photo"
          className="flex items-center justify-center overflow-hidden relative"
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "var(--surface)",
            border: "2px dashed var(--border-strong)",
          }}
        >
          {avatarPreview ? (
            <Image
              src={avatarPreview}
              alt="Avatar"
              fill
              style={{ objectFit: "cover" }}
            />
          ) : (
            <Camera size={24} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <p className="font-montserrat" style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)", marginTop: "6px" }}>
          Add photo
        </p>
        <p className="font-montserrat" style={{ fontSize: "10px", color: "var(--text-muted)" }}>
          Optional
        </p>
      </div>

      {/* Form */}
      <div
        className="flex flex-col"
        style={{ padding: "0 24px", marginTop: "24px", gap: "14px" }}
      >
        {/* First Name */}
        <div className="flex flex-col gap-[6px]">
          <label className="font-montserrat uppercase" style={labelStyle}>
            First Name <span style={{ color: "var(--error)" }}>*</span>
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Hayley"
            className="font-montserrat"
            style={inputStyle(errors.firstName)}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = errors.firstName ? "var(--error)" : "var(--border)")}
          />
        </div>

        {/* Last Name */}
        <div className="flex flex-col gap-[6px]">
          <label className="font-montserrat uppercase" style={labelStyle}>
            Last Name <span style={{ color: "var(--error)" }}>*</span>
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Williams"
            className="font-montserrat"
            style={inputStyle(errors.lastName)}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = errors.lastName ? "var(--error)" : "var(--border)")}
          />
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-[6px]">
          <label className="font-montserrat uppercase" style={labelStyle}>
            Bio
          </label>
          <div className="relative">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
              placeholder="Tell brands a little about yourself..."
              rows={4}
              className="w-full font-montserrat resize-none outline-none"
              style={{
                background: "var(--surface)",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                padding: "12px 16px",
                color: "var(--text)",
                fontSize: "14px",
                fontWeight: 500,
                caretColor: "var(--accent)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <span
              className="absolute bottom-2 right-3 font-montserrat"
              style={{ fontSize: "10px", color: "var(--text-muted)" }}
            >
              {bio.length}/{MAX_BIO}
            </span>
          </div>
        </div>

        {/* Instagram */}
        <div className="flex flex-col gap-[6px]">
          <label className="font-montserrat uppercase" style={labelStyle}>
            Instagram Handle
          </label>
          <input
            type="text"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@yourhandle"
            className="font-montserrat"
            style={inputStyle(false)}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {/* TikTok */}
        <div className="flex flex-col gap-[6px]">
          <label className="font-montserrat uppercase" style={labelStyle}>
            TikTok Handle
          </label>
          <input
            type="text"
            value={tiktok}
            onChange={(e) => setTiktok(e.target.value)}
            placeholder="@yourhandle"
            className="font-montserrat"
            style={inputStyle(false)}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {/* YouTube */}
        <div className="flex flex-col gap-[6px]">
          <label className="font-montserrat uppercase" style={labelStyle}>
            YouTube URL
          </label>
          <input
            type="url"
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            placeholder="https://youtube.com/@yourchannel"
            className="font-montserrat"
            style={inputStyle(false)}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {error && (
          <p className="font-montserrat" style={{ fontSize: "12px", fontWeight: 500, color: "var(--error)", textAlign: "center" }}>
            {error}
          </p>
        )}

        {/* Continue */}
        <WgyButton
          variant="primary"
          fullWidth
          onClick={handleContinue}
          disabled={saving || uploading}
          style={{ marginTop: "8px", opacity: saving || uploading ? 0.6 : 1 }}
        >
          {saving ? "Saving…" : uploading ? "Uploading photo…" : "Continue"}
        </WgyButton>

        {/* Skip — profile fields are all optional except name (prefilled from
            the account), so skipping straight to the app is fine. */}
        <button
          type="button"
          onClick={finishOnboarding}
          disabled={saving || uploading}
          className="w-full text-center font-montserrat font-normal"
          style={{ fontSize: "12px", color: "var(--text-muted)" }}
        >
          Skip for now
        </button>
      </div>

      <style>{`
        input::placeholder, textarea::placeholder { color: var(--text-muted); }
      `}</style>

      <div className="pb-10" />
    </div>
  );
}
