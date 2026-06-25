"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { WgyButton } from "@/components/ui/wgy-button";

const MAX_BIO = 160;

export default function ProfileSetupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [errors, setErrors] = useState({ firstName: false, lastName: false });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  }

  function handleContinue() {
    const newErrors = {
      firstName: !firstName.trim(),
      lastName: !lastName.trim(),
    };
    setErrors(newErrors);
    if (newErrors.firstName || newErrors.lastName) return;
    // TODO Phase 2: Save to database, navigate to address setup (step 2)
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

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)", maxWidth: "390px", margin: "0 auto" }}
    >
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-5">
        <span className="rounded-full" style={{ width: "8px", height: "8px", background: "var(--accent)" }} />
        <span className="rounded-full" style={{ width: "8px", height: "8px", background: "var(--surface-2)" }} />
        <span className="rounded-full" style={{ width: "8px", height: "8px", background: "var(--surface-2)" }} />
      </div>

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

        {/* Continue */}
        <WgyButton variant="primary" fullWidth onClick={handleContinue} style={{ marginTop: "8px" }}>
          Continue
        </WgyButton>

        {/* Skip */}
        {/* TODO Phase 2: Navigate to /home */}
        <button
          type="button"
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
