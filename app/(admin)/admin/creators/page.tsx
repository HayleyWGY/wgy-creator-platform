"use client";

import { useState } from "react";
import { Search, X, MessageSquare } from "lucide-react";

// TODO Phase 3: Replace with DB query (paginated, filterable by status/tag)
const CREATORS = [
  {
    name: "Sophie Chen",
    email: "sophie@email.com",
    initials: "SC",
    status: "active",
    joined: "Jan 2024",
    tags: ["Boots May 2026", "PERL"],
    extraTags: "+3",
    instagram: "@sophiechen_beauty",
    tiktok: "@sophiechen",
    youtube: "Not provided",
    address: "14 Rose Lane, London, SE1 4AB",
    postcode: "SE1 4AB",
    membership: "Paid · £25/month",
    lastLogin: "2 hours ago",
  },
  {
    name: "Maya Patel",
    email: "maya@email.com",
    initials: "MP",
    status: "active",
    joined: "Feb 2024",
    tags: ["Nature Spell", "VitD"],
    extraTags: null,
    instagram: "@mayapatel",
    tiktok: "@mayapatel_beauty",
    youtube: "Not provided",
    address: "Not provided",
    postcode: "Not provided",
    membership: "Paid · £25/month",
    lastLogin: "1 day ago",
  },
  {
    name: "Laura Edwards",
    email: "laura@email.com",
    initials: "LE",
    status: "active",
    joined: "Mar 2024",
    tags: ["PERL"],
    extraTags: "+12",
    instagram: "@lauraedwards",
    tiktok: "@lauraedwards_",
    youtube: "Not provided",
    address: "Not provided",
    postcode: "Not provided",
    membership: "Paid · £25/month",
    lastLogin: "5 minutes ago",
  },
  {
    name: "Libbie Thomas",
    email: "libbie@email.com",
    initials: "LT",
    status: "active",
    joined: "Mar 2024",
    tags: ["PERL"],
    extraTags: "+7",
    instagram: "@libbiethomas",
    tiktok: "Not provided",
    youtube: "Not provided",
    address: "Not provided",
    postcode: "Not provided",
    membership: "Paid · £25/month",
    lastLogin: "3 days ago",
  },
  {
    name: "Charlotte Hamilton",
    email: "charlotte@email.com",
    initials: "CH",
    status: "free",
    joined: "Apr 2024",
    tags: [],
    extraTags: null,
    instagram: "Not provided",
    tiktok: "Not provided",
    youtube: "Not provided",
    address: "Not provided",
    postcode: "Not provided",
    membership: "Free",
    lastLogin: "1 week ago",
  },
  {
    name: "Hanna Dixon",
    email: "hanna@email.com",
    initials: "HD",
    status: "active",
    joined: "Apr 2024",
    tags: ["Kaleidos"],
    extraTags: null,
    instagram: "@hannadixon",
    tiktok: "Not provided",
    youtube: "Not provided",
    address: "Not provided",
    postcode: "Not provided",
    membership: "Paid · £25/month",
    lastLogin: "Yesterday",
  },
  {
    name: "Maria Stamelou",
    email: "maria@email.com",
    initials: "MS",
    status: "active",
    joined: "May 2024",
    tags: [],
    extraTags: null,
    instagram: "Not provided",
    tiktok: "Not provided",
    youtube: "Not provided",
    address: "Not provided",
    postcode: "Not provided",
    membership: "Paid · £25/month",
    lastLogin: "2 days ago",
  },
  {
    name: "Samantha Johnson",
    email: "samantha@email.com",
    initials: "SJ",
    status: "payment_failed",
    joined: "Jun 2024",
    tags: ["Boots May 2026"],
    extraTags: null,
    instagram: "Not provided",
    tiktok: "Not provided",
    youtube: "Not provided",
    address: "Not provided",
    postcode: "Not provided",
    membership: "Paid · £25/month (failed)",
    lastLogin: "4 days ago",
  },
];

type Creator = typeof CREATORS[number];

function StatusPill({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span
        className="font-montserrat font-semibold uppercase"
        style={{ fontSize: "9px", letterSpacing: "0.10em", background: "#e4dcd1", color: "#222222", padding: "3px 10px", borderRadius: "20px" }}
      >
        Active
      </span>
    );
  }
  if (status === "free") {
    return (
      <span
        className="font-montserrat font-semibold uppercase"
        style={{ fontSize: "9px", letterSpacing: "0.10em", background: "rgba(228,220,209,0.15)", color: "#e4dcd1", padding: "3px 10px", borderRadius: "20px" }}
      >
        Free
      </span>
    );
  }
  return (
    <span
      className="font-montserrat font-semibold uppercase"
      style={{ fontSize: "9px", letterSpacing: "0.10em", background: "rgba(192,57,43,0.15)", color: "#C0392B", padding: "3px 10px", borderRadius: "20px" }}
    >
      Failed
    </span>
  );
}

const DETAIL_ROWS = [
  { label: "MEMBERSHIP",  key: "membership"  },
  { label: "INSTAGRAM",   key: "instagram"   },
  { label: "TIKTOK",      key: "tiktok"      },
  { label: "YOUTUBE",     key: "youtube"     },
  { label: "ADDRESS",     key: "address"     },
  { label: "POSTCODE",    key: "postcode"    },
] as const;

function CreatorPanel({ creator, onClose }: { creator: Creator; onClose: () => void }) {
  const [tagInput, setTagInput] = useState("");

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 49,
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          width: "480px",
          height: "100vh",
          background: "#1a1a1a",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          zIndex: 50,
          overflowY: "auto",
          padding: "24px",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", cursor: "pointer", padding: "4px" }}
        >
          <X size={18} color="#706b6b" strokeWidth={1.5} />
        </button>

        {/* Label */}
        <p
          className="font-montserrat font-bold uppercase"
          style={{ fontSize: "10px", letterSpacing: "0.12em", color: "#e4dcd1" }}
        >
          Creator Profile
        </p>

        {/* Name */}
        <h2
          className="font-playfair italic font-normal text-white"
          style={{ fontSize: "24px", marginTop: "8px" }}
        >
          {creator.name}
        </h2>

        {/* Profile section */}
        <div style={{ marginTop: "20px", display: "flex", gap: "16px", alignItems: "center" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#e4dcd1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span className="font-montserrat font-bold" style={{ fontSize: "18px", color: "#222222" }}>
              {creator.initials}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "#706b6b" }}>{creator.email}</p>
            <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b", marginTop: "2px" }}>
              Joined {creator.joined}
            </p>
            <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b", marginTop: "1px" }}>
              Last login: {creator.lastLogin}
            </p>
          </div>
          <StatusPill status={creator.status} />
        </div>

        {/* Detail rows */}
        <div style={{ marginTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {DETAIL_ROWS.map((row) => (
            <div
              key={row.label}
              style={{
                padding: "12px 0",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
              }}
            >
              <span
                className="font-montserrat font-normal uppercase"
                style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#706b6b", flexShrink: 0 }}
              >
                {row.label}
              </span>
              <span
                className="font-montserrat font-normal"
                style={{ fontSize: "13px", color: "#ffffff", textAlign: "right" }}
              >
                {creator[row.key]}
              </span>
            </div>
          ))}
        </div>

        {/* Campaign tags */}
        <div style={{ marginTop: "20px" }}>
          <p
            className="font-montserrat font-bold uppercase"
            style={{ fontSize: "10px", letterSpacing: "0.12em", color: "#e4dcd1" }}
          >
            Campaign Tags
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
            {creator.tags.map((tag) => (
              <span
                key={tag}
                className="font-montserrat font-semibold uppercase"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.06em",
                  background: "#333333",
                  color: "#e4dcd1",
                  padding: "4px 10px",
                  borderRadius: "20px",
                }}
              >
                {tag}
              </span>
            ))}
            {creator.extraTags && (
              <span
                className="font-montserrat font-semibold"
                style={{
                  fontSize: "10px",
                  background: "#333333",
                  color: "#706b6b",
                  padding: "4px 10px",
                  borderRadius: "20px",
                }}
              >
                {creator.extraTags} more
              </span>
            )}
          </div>

          {/* Add tag input */}
          <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add tag..."
              className="font-montserrat font-normal"
              style={{
                flex: 1,
                height: "36px",
                background: "#2a2a2a",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                padding: "0 12px",
                color: "#ffffff",
                fontSize: "12px",
                outline: "none",
              }}
            />
            <button
              onClick={() => setTagInput("")}
              className="font-montserrat font-semibold"
              style={{
                height: "36px",
                padding: "0 14px",
                background: "#e4dcd1",
                color: "#222222",
                fontSize: "13px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            marginTop: "24px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <button
            className="font-montserrat font-semibold"
            style={{
              width: "100%",
              height: "40px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              color: "#e4dcd1",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <MessageSquare size={15} strokeWidth={1.5} />
            Send Direct Message
          </button>
          <button
            className="font-montserrat font-semibold"
            style={{
              width: "100%",
              height: "40px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              color: "#e4dcd1",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Send to Mass DM List
          </button>
          <button
            className="font-montserrat font-semibold"
            style={{
              width: "100%",
              height: "40px",
              background: "rgba(192,57,43,0.1)",
              border: "none",
              borderRadius: "8px",
              color: "#C0392B",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Suspend Account
          </button>
        </div>
      </div>

      <style>{`input::placeholder { color: #706b6b; }`}</style>
    </>
  );
}

export default function CreatorsPage() {
  const [panelCreator, setPanelCreator] = useState<Creator | null>(null);

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "32px 32px 24px" }}>
        <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "#706b6b" }}>
          Creators
        </p>
        <h1 className="font-playfair italic font-normal text-white" style={{ fontSize: "32px", marginTop: "4px" }}>
          Creator Management
        </h1>
      </div>

      {/* Action row */}
      <div style={{ padding: "0 32px 20px", display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "360px" }}>
          <Search
            size={15}
            color="#706b6b"
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          />
          <input
            type="text"
            placeholder="Search creators..."
            className="font-montserrat font-normal"
            style={{
              width: "100%",
              height: "44px",
              background: "#2a2a2a",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              paddingLeft: "36px",
              paddingRight: "16px",
              color: "#ffffff",
              fontSize: "13px",
              outline: "none",
              caretColor: "#e4dcd1",
            }}
          />
        </div>
        <select
          className="font-montserrat font-normal"
          style={{
            background: "#2a2a2a",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            padding: "0 14px",
            height: "44px",
            color: "#706b6b",
            fontSize: "13px",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option>All Statuses</option>
          <option>Active</option>
          <option>Free</option>
          <option>Payment Failed</option>
        </select>
        <button
          className="font-montserrat font-semibold"
          style={{
            background: "#e4dcd1",
            color: "#222222",
            fontSize: "12px",
            padding: "0 16px",
            height: "44px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            marginLeft: "auto",
          }}
        >
          + Add Free Member
        </button>
      </div>

      {/* Table */}
      <div style={{ padding: "0 32px 32px" }}>
        <div style={{ background: "#2a2a2a", borderRadius: "12px", overflow: "hidden" }}>
          {/* Header */}
          <div
            style={{
              background: "#1a1a1a",
              padding: "12px 20px",
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1.5fr 1fr",
              gap: "12px",
            }}
          >
            {["Name", "Status", "Joined", "Tags", "Actions"].map((col) => (
              <span
                key={col}
                className="font-montserrat font-bold uppercase"
                style={{ fontSize: "10px", letterSpacing: "0.10em", color: "#706b6b" }}
              >
                {col}
              </span>
            ))}
          </div>

          {/* Rows */}
          {CREATORS.map((creator, i) => (
            <div
              key={i}
              style={{
                padding: "16px 20px",
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1.5fr 1fr",
                gap: "12px",
                alignItems: "center",
                borderBottom: i < CREATORS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              {/* Name */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#e4dcd1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span className="font-montserrat font-bold" style={{ fontSize: "10px", color: "#222222" }}>{creator.initials}</span>
                </div>
                <div>
                  <p className="font-montserrat font-medium" style={{ fontSize: "13px", color: "#ffffff" }}>{creator.name}</p>
                  <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b" }}>{creator.email}</p>
                </div>
              </div>

              {/* Status */}
              <StatusPill status={creator.status} />

              {/* Joined */}
              <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "#706b6b" }}>{creator.joined}</p>

              {/* Tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {creator.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-montserrat font-semibold uppercase"
                    style={{ fontSize: "9px", letterSpacing: "0.08em", background: "#333333", color: "#e4dcd1", padding: "3px 8px", borderRadius: "20px" }}
                  >
                    {tag}
                  </span>
                ))}
                {creator.extraTags && (
                  <span
                    className="font-montserrat font-normal"
                    style={{ fontSize: "9px", color: "#706b6b", border: "1px solid rgba(255,255,255,0.1)", padding: "3px 8px", borderRadius: "20px" }}
                  >
                    {creator.extraTags}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => setPanelCreator(creator)}
                  className="font-montserrat font-semibold"
                  style={{ fontSize: "11px", color: "#e4dcd1", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  View
                </button>
                <button
                  className="font-montserrat font-semibold"
                  style={{ fontSize: "11px", color: "#706b6b", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px" }}>
          <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "#706b6b" }}>
            Showing 8 of 1,024 creators
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button className="font-montserrat font-normal" style={{ fontSize: "12px", color: "#706b6b", background: "none", border: "none", cursor: "pointer" }}>
              ← Previous
            </button>
            <span className="font-montserrat font-semibold" style={{ fontSize: "12px", color: "#e4dcd1", background: "rgba(228,220,209,0.1)", padding: "4px 10px", borderRadius: "6px" }}>
              1
            </span>
            <button className="font-montserrat font-normal" style={{ fontSize: "12px", color: "#706b6b", background: "none", border: "none", cursor: "pointer" }}>
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Slide-in panel */}
      {panelCreator && (
        <CreatorPanel creator={panelCreator} onClose={() => setPanelCreator(null)} />
      )}

      <style>{`input::placeholder { color: #706b6b; }`}</style>
    </div>
  );
}
