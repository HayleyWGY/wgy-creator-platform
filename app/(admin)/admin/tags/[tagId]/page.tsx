"use client";

import Link from "next/link";

// TODO Phase 3: Replace with DB query — fetch tag + creators by tagId
const TAG_DATA: Record<string, { name: string; colour: string; count: number }> = {
  "boots-may-2026": { name: "Boots May 2026", colour: "#9b7e56", count: 47 },
  "perl":           { name: "PERL",           colour: "var(--accent)", count: 89 },
  "nature-spell":   { name: "Nature Spell",   colour: "#4a5e4a", count: 23 },
  "kaleidos":       { name: "Kaleidos",       colour: "#3d3550", count: 34 },
  "vitd":           { name: "VitD",           colour: "var(--text-muted)", count: 156 },
  "boots-apr-2026": { name: "Boots Apr 2026", colour: "#8b6f5e", count: 41 },
};

// TODO Phase 3: Replace with DB query — creators filtered by tag
const TAG_CREATORS: Record<string, { name: string; initials: string; email: string; status: string; joined: string }[]> = {
  "boots-may-2026": [
    { name: "Sophie Chen",      initials: "SC", email: "sophie@email.com",   status: "active",         joined: "Jan 2024" },
    { name: "Maya Patel",       initials: "MP", email: "maya@email.com",     status: "active",         joined: "Feb 2024" },
    { name: "Laura Edwards",    initials: "LE", email: "laura@email.com",    status: "active",         joined: "Mar 2024" },
    { name: "Samantha Johnson", initials: "SJ", email: "samantha@email.com", status: "payment_failed", joined: "Jun 2024" },
  ],
};

function StatusPill({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span
        className="font-montserrat font-semibold uppercase"
        style={{ fontSize: "9px", letterSpacing: "0.10em", background: "var(--accent)", color: "var(--bg)", padding: "3px 10px", borderRadius: "20px" }}
      >
        Active
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

export default function TagDetailPage({ params }: { params: { tagId: string } }) {
  const tag = TAG_DATA[params.tagId];
  const creators = TAG_CREATORS[params.tagId] ?? [];

  if (!tag) {
    return (
      <div style={{ padding: "32px" }}>
        <Link href="/admin/tags" className="font-montserrat font-semibold" style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none" }}>
          ← Back to Tags
        </Link>
        <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "24px" }}>
          Tag not found.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "32px 32px 24px" }}>
        <Link
          href="/admin/tags"
          className="font-montserrat font-semibold"
          style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none", display: "inline-block", marginBottom: "16px" }}
        >
          ← Back to Tags
        </Link>

        <p
          className="font-montserrat font-bold uppercase"
          style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--text-muted)" }}
        >
          Tags
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: tag.colour,
              flexShrink: 0,
              marginTop: "4px",
            }}
          />
          <h1 className="font-playfair italic font-normal text-white" style={{ fontSize: "32px" }}>
            {tag.name}
          </h1>
        </div>

        <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
          {tag.count} creators with this tag
        </p>
      </div>

      {/* Table */}
      <div style={{ padding: "0 32px 32px" }}>
        <div style={{ background: "var(--surface)", borderRadius: "12px", overflow: "hidden" }}>
          {/* Header */}
          <div
            style={{
              background: "var(--surface)",
              padding: "12px 20px",
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: "12px",
            }}
          >
            {["Name", "Status", "Joined", "Actions"].map((col) => (
              <span
                key={col}
                className="font-montserrat font-bold uppercase"
                style={{ fontSize: "10px", letterSpacing: "0.10em", color: "var(--text-muted)" }}
              >
                {col}
              </span>
            ))}
          </div>

          {/* Rows */}
          {creators.map((creator, i) => (
            <div
              key={i}
              style={{
                padding: "16px 20px",
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr",
                gap: "12px",
                alignItems: "center",
                borderBottom: i < creators.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              {/* Name */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span className="font-montserrat font-bold" style={{ fontSize: "10px", color: "var(--bg)" }}>{creator.initials}</span>
                </div>
                <div>
                  <p className="font-montserrat font-medium" style={{ fontSize: "13px", color: "var(--text)" }}>{creator.name}</p>
                  <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{creator.email}</p>
                </div>
              </div>

              <StatusPill status={creator.status} />

              <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)" }}>{creator.joined}</p>

              <div style={{ display: "flex", gap: "12px" }}>
                <button className="font-montserrat font-semibold" style={{ fontSize: "11px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  View
                </button>
                <button className="font-montserrat font-semibold" style={{ fontSize: "11px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  Remove Tag
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
