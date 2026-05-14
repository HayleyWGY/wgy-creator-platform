"use client";

import { useSession, signOut } from "next-auth/react";
import { PillTag } from "@/components/ui/pill-tag";

const DETAILS_STATIC = [
  { label: "Location",     value: "London, UK"   },
  { label: "Member Since", value: "January 2024" },
];

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#e4dcd1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="#e4dcd1" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="#e4dcd1">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.19 8.19 0 0 0 4.79 1.52V6.75a4.85 4.85 0 0 1-1.02-.06z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="#e4dcd1">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon fill="#222222" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
    </svg>
  );
}

export default function ProfilePage() {
  const { data: session } = useSession();

  const firstName   = session?.user?.firstName ?? "";
  const lastName    = session?.user?.lastName ?? "";
  const email       = session?.user?.email ?? "";
  const initials    = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const displayName = `${firstName} ${lastName.charAt(0)}`;

  const details = [
    { label: "Name",     value: displayName },
    { label: "Email",    value: email       },
    ...DETAILS_STATIC,
  ];

  return (
    <div>
      {/* Top profile section */}
      <div className="px-5 pt-8 pb-6 flex flex-col items-center text-center">
        {/* Avatar */}
        <div
          className="w-[88px] h-[88px] rounded-full flex items-center justify-center"
          style={{ background: "#2a2a2a", border: "2px solid #e4dcd1" }}
        >
          <span className="font-montserrat font-semibold text-white" style={{ fontSize: "20px" }}>
            {initials || "?"}
          </span>
        </div>

        {/* Name */}
        <h1 className="text-heading-large text-white mt-3">{displayName || "..."}</h1>

        {/* Role pill */}
        <div className="mt-2">
          <PillTag label="WGY Creator" />
        </div>

        {/* Bio */}
        <p className="font-montserrat font-normal mt-2" style={{ fontSize: "13px", color: "#706b6b", lineHeight: 1.6 }}>
          Beauty and lifestyle creator based in the UK
        </p>

        {/* Social icons */}
        <div className="flex items-center mt-[14px]" style={{ gap: "20px" }}>
          <a href="#" aria-label="Instagram"><InstagramIcon /></a>
          <a href="#" aria-label="TikTok"><TikTokIcon /></a>
          <a href="#" aria-label="YouTube"><YouTubeIcon /></a>
        </div>
      </div>

      {/* My Campaigns */}
      <div className="px-5 mt-2">
        <span className="text-section-label">My Campaigns</span>
        <div className="flex flex-wrap gap-2 mt-3">
          <PillTag label="Boots May 2026" />
          <PillTag label="Nature Spell" />
          <PillTag label="PERL" />
          <span
            className="inline-block px-[10px] py-[3px] rounded-pill font-montserrat font-semibold uppercase"
            style={{ fontSize: "9px", letterSpacing: "0.10em", background: "rgba(228,220,209,0.2)", color: "#706b6b" }}
          >
            +4 more
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 mt-6 mb-5" style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

      {/* My Details */}
      <div className="px-5">
        <span className="text-section-label">My Details</span>
        <div className="mt-2">
          {details.map((row, i) => (
            <div key={i} className="flex flex-col py-[14px]" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="font-montserrat font-normal uppercase mb-1" style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#706b6b" }}>
                {row.label}
              </span>
              <span className="font-montserrat font-normal text-white" style={{ fontSize: "13px" }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="px-5 mt-8 flex flex-col gap-3">
        <button
          className="w-full h-11 rounded-button font-montserrat font-semibold transition-opacity active:opacity-70"
          style={{ fontSize: "13px", color: "#e4dcd1", border: "1px solid #e4dcd1", background: "transparent" }}
        >
          Edit Profile
        </button>
        <button
          className="w-full h-11 rounded-button font-montserrat font-semibold transition-opacity active:opacity-70"
          style={{ fontSize: "13px", color: "#e4dcd1", border: "1px solid #e4dcd1", background: "transparent" }}
        >
          Manage Membership
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          className="w-full text-center font-montserrat font-normal mt-1"
          style={{ fontSize: "12px", color: "#706b6b", background: "none", border: "none", cursor: "pointer" }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
