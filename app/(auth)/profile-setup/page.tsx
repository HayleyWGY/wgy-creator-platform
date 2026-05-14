"use client";

import { useState, useRef } from "react";
import { Camera } from "lucide-react";

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

  const inputStyle = (hasError: boolean) => ({
    background: "#2a2a2a",
    borderRadius: "8px",
    border: `1px solid ${hasError ? "#C0392B" : "rgba(255,255,255,0.08)"}`,
    height: "48px",
    padding: "0 16px",
    color: "#ffffff",
    fontSize: "14px",
    caretColor: "#e4dcd1",
    width: "100%",
    outline: "none",
  });

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#222222", maxWidth: "390px", margin: "0 auto" }}
    >
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-5">
        <span
          className="rounded-full"
          style={{ width: "8px", height: "8px", background: "#e4dcd1" }}
        />
        <span
          className="rounded-full"
          style={{ width: "8px", height: "8px", background: "#2a2a2a" }}
        />
        <span
          className="rounded-full"
          style={{ width: "8px", height: "8px", background: "#2a2a2a" }}
        />
      </div>

      {/* Logo */}
      <div className="flex justify-center" style={{ marginTop: "16px" }}>
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
        style={{ fontSize: "24px", marginTop: "24px" }}
      >
        Set up your profile
      </h1>
      <p
        className="font-montserrat font-normal text-center"
        style={{ fontSize: "13px", color: "#706b6b", marginTop: "6px", padding: "0 24px" }}
      >
        This helps brands find the right creators for their campaigns
      </p>

      {/* Avatar upload */}
      <div className="flex flex-col items-center" style={{ marginTop: "24px" }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center overflow-hidden"
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "#2a2a2a",
            border: "2px dashed rgba(228,220,209,0.3)",
          }}
        >
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <Camera size={24} color="#706b6b" strokeWidth={1.5} />
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b", marginTop: "6px" }}>
          Add photo
        </p>
        <p className="font-montserrat font-normal" style={{ fontSize: "10px", color: "#4a4a4a" }}>
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
          <label className="font-montserrat font-medium uppercase" style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#e4dcd1" }}>
            First Name <span style={{ color: "#C0392B" }}>*</span>
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Hayley"
            className="font-montserrat font-normal"
            style={inputStyle(errors.firstName)}
            onFocus={(e) => (e.target.style.borderColor = "#e4dcd1")}
            onBlur={(e) => (e.target.style.borderColor = errors.firstName ? "#C0392B" : "rgba(255,255,255,0.08)")}
          />
        </div>

        {/* Last Name */}
        <div className="flex flex-col gap-[6px]">
          <label className="font-montserrat font-medium uppercase" style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#e4dcd1" }}>
            Last Name <span style={{ color: "#C0392B" }}>*</span>
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Williams"
            className="font-montserrat font-normal"
            style={inputStyle(errors.lastName)}
            onFocus={(e) => (e.target.style.borderColor = "#e4dcd1")}
            onBlur={(e) => (e.target.style.borderColor = errors.lastName ? "#C0392B" : "rgba(255,255,255,0.08)")}
          />
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-[6px]">
          <label className="font-montserrat font-medium uppercase" style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#e4dcd1" }}>
            Bio
          </label>
          <div className="relative">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
              placeholder="Tell brands a little about yourself..."
              rows={4}
              className="w-full font-montserrat font-normal resize-none outline-none"
              style={{
                background: "#2a2a2a",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "12px 16px",
                color: "#ffffff",
                fontSize: "14px",
                caretColor: "#e4dcd1",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#e4dcd1")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
            />
            <span
              className="absolute bottom-2 right-3 font-montserrat font-normal"
              style={{ fontSize: "10px", color: "#706b6b" }}
            >
              {bio.length}/{MAX_BIO}
            </span>
          </div>
        </div>

        {/* Instagram */}
        <div className="flex flex-col gap-[6px]">
          <label className="font-montserrat font-medium uppercase" style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#e4dcd1" }}>
            Instagram Handle
          </label>
          <input
            type="text"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@yourhandle"
            className="font-montserrat font-normal"
            style={inputStyle(false)}
            onFocus={(e) => (e.target.style.borderColor = "#e4dcd1")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
          />
        </div>

        {/* TikTok */}
        <div className="flex flex-col gap-[6px]">
          <label className="font-montserrat font-medium uppercase" style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#e4dcd1" }}>
            TikTok Handle
          </label>
          <input
            type="text"
            value={tiktok}
            onChange={(e) => setTiktok(e.target.value)}
            placeholder="@yourhandle"
            className="font-montserrat font-normal"
            style={inputStyle(false)}
            onFocus={(e) => (e.target.style.borderColor = "#e4dcd1")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
          />
        </div>

        {/* YouTube */}
        <div className="flex flex-col gap-[6px]">
          <label className="font-montserrat font-medium uppercase" style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#e4dcd1" }}>
            YouTube URL
          </label>
          <input
            type="url"
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            placeholder="https://youtube.com/@yourchannel"
            className="font-montserrat font-normal"
            style={inputStyle(false)}
            onFocus={(e) => (e.target.style.borderColor = "#e4dcd1")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
          />
        </div>

        {/* Continue */}
        <button
          type="button"
          onClick={handleContinue}
          className="w-full font-montserrat font-semibold transition-opacity active:opacity-80"
          style={{
            height: "48px",
            borderRadius: "8px",
            background: "#e4dcd1",
            color: "#222222",
            fontSize: "14px",
            marginTop: "8px",
          }}
        >
          Continue
        </button>

        {/* Skip */}
        {/* TODO Phase 2: Navigate to /home */}
        <button
          type="button"
          className="w-full text-center font-montserrat font-normal"
          style={{ fontSize: "12px", color: "#706b6b" }}
        >
          Skip for now
        </button>
      </div>

      <style>{`
        input::placeholder, textarea::placeholder { color: #706b6b; }
      `}</style>

      <div className="pb-10" />
    </div>
  );
}
