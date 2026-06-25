"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import Link from "next/link";

// TODO Phase 3: Replace with DB query — tags with creator count
const TAGS = [
  { name: "Boots May 2026", slug: "boots-may-2026", colour: "#9b7e56", count: 47 },
  { name: "PERL",           slug: "perl",           colour: "var(--accent)", count: 89 },
  { name: "Nature Spell",   slug: "nature-spell",   colour: "#4a5e4a", count: 23 },
  { name: "Kaleidos",       slug: "kaleidos",       colour: "#3d3550", count: 34 },
  { name: "VitD",           slug: "vitd",           colour: "var(--text-muted)", count: 156 },
  { name: "Boots Apr 2026", slug: "boots-apr-2026", colour: "#8b6f5e", count: 41 },
];

const COLOUR_SWATCHES = ["var(--accent)", "#9b7e56", "var(--text-muted)", "#4a5e4a", "#3d3550", "#8b6f5e"];

function CreateTagModal({ onClose }: { onClose: () => void }) {
  const [tagName, setTagName]       = useState("");
  const [selectedColour, setColour] = useState("var(--accent)");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "12px",
          padding: "24px",
          width: "400px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p
            className="font-montserrat font-bold uppercase"
            style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--accent)" }}
          >
            Create New Tag
          </p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
            <X size={16} color="var(--text-muted)" strokeWidth={1.5} />
          </button>
        </div>

        {/* Tag name */}
        <input
          type="text"
          value={tagName}
          onChange={(e) => setTagName(e.target.value)}
          placeholder="e.g. Boots June 2026"
          className="font-montserrat font-normal"
          style={{
            width: "100%",
            height: "44px",
            background: "var(--surface-2)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            padding: "0 14px",
            color: "var(--text)",
            fontSize: "13px",
            outline: "none",
            marginTop: "12px",
            boxSizing: "border-box",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
        />

        {/* Colour */}
        <p
          className="font-montserrat font-bold uppercase"
          style={{ fontSize: "10px", letterSpacing: "0.10em", color: "var(--text-muted)", marginTop: "16px" }}
        >
          Tag Colour
        </p>
        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          {COLOUR_SWATCHES.map((colour) => (
            <button
              key={colour}
              onClick={() => setColour(colour)}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: colour,
                border: "none",
                cursor: "pointer",
                outline: selectedColour === colour ? "2px solid var(--text)" : "2px solid transparent",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>

        {/* Create button */}
        <button
          onClick={onClose}
          className="font-montserrat font-semibold"
          style={{
            width: "100%",
            height: "44px",
            background: "var(--accent)",
            color: "var(--bg)",
            fontSize: "13px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            marginTop: "20px",
          }}
        >
          Create Tag
        </button>

        {/* Cancel */}
        <div style={{ textAlign: "center", marginTop: "10px" }}>
          <button
            onClick={onClose}
            className="font-montserrat font-normal"
            style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      </div>

      <style>{`input::placeholder { color: var(--text-muted); }`}</style>
    </div>
  );
}

export default function TagsPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      {/* Header */}
      <div
        style={{
          padding: "32px 32px 24px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p
            className="font-montserrat font-bold uppercase"
            style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--text-muted)" }}
          >
            Tags
          </p>
          <h1
            className="admin-title"
            style={{ fontSize: "32px", marginTop: "4px" }}
          >
            Tag Management
          </h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="font-montserrat font-semibold"
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
            fontSize: "12px",
            padding: "0 16px",
            height: "44px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
        >
          + Create New Tag
        </button>
      </div>

      {/* Tags grid */}
      <div
        style={{
          padding: "0 32px 32px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
        }}
      >
        {TAGS.map((tag) => (
          <div
            key={tag.name}
            style={{
              background: "var(--surface)",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Top row */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: tag.colour, flexShrink: 0 }} />
              <p className="font-montserrat font-semibold" style={{ fontSize: "14px", color: "var(--text)", flex: 1 }}>
                {tag.name}
              </p>
              <button style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                <Pencil size={16} color="var(--text-muted)" strokeWidth={1.5} />
              </button>
            </div>

            {/* Creator count */}
            <p
              className="font-montserrat font-bold uppercase"
              style={{ fontSize: "9px", letterSpacing: "0.10em", color: "var(--text-muted)", marginTop: "12px" }}
            >
              Creators
            </p>
            <p className="font-montserrat font-semibold" style={{ fontSize: "20px", color: "var(--text)" }}>
              {tag.count}
            </p>

            {/* View link */}
            <Link
              href={`/admin/tags/${tag.slug}`}
              className="font-montserrat font-semibold"
              style={{ fontSize: "11px", color: "var(--accent)", textDecoration: "none", display: "inline-block", marginTop: "8px" }}
            >
              View creators →
            </Link>
          </div>
        ))}
      </div>

      {showModal && <CreateTagModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
