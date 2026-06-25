"use client";

import { useState } from "react";
import { PenLine, X, CheckCircle } from "lucide-react";

// TODO Phase 3: Replace with DB query — client_posts table where status = 'pending'
// TODO Phase 3: On Approve — create campaign in DB and send OneSignal push to all creators
// TODO Phase 3: On Reject — update status and email client with reason via Klaviyo

const PENDING = [
  {
    id: 1,
    client: "Glow Beauty",
    submittedAgo: "1 hour ago",
    title: "Summer Glow 2026 Campaign",
    type: "PR / Gifted",
    preview:
      "Glow Beauty is looking for UK-based skincare creators for their Summer Glow 2026 campaign. Products gifted in exchange for honest content featuring their new SPF range.",
    section: "PR / Gifted Campaigns",
    applyLink: "https://forms.google.com/glowbeauty",
    coverImage: null as string | null,
  },
  {
    id: 2,
    client: "Kaleidos",
    submittedAgo: "3 hours ago",
    title: "Winter Edit Campaign",
    type: "Paid Collab",
    preview:
      "Kaleidos is seeking UK-based makeup creators for their Winter Edit campaign. Selected creators will receive the full Winter Edit collection plus a paid fee.",
    section: "Paid Collaborations",
    applyLink: "https://forms.google.com/kaleidos",
    coverImage: null as string | null,
  },
];

const APPROVED_EXAMPLE = [
  {
    id: 10,
    client: "FW Beauty",
    title: "FW Beauty Gifting Campaign",
    type: "PR / Gifted",
    approvedAgo: "2 days ago",
    approvedBy: "Hayley W",
    section: "PR / Gifted Campaigns",
  },
];

const REJECTED_EXAMPLE = [
  {
    id: 20,
    client: "Brand X",
    title: "Brand X Promotion",
    type: "PR / Gifted",
    rejectedAgo: "1 week ago",
    reason: "Post content did not meet WGY quality standards. Please revise and resubmit.",
  },
];

type Tab = "pending" | "approved" | "rejected";

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [publishedIds, setPublishedIds] = useState<Set<number>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<number>>(new Set());

  const pendingItems = PENDING.filter((p) => !publishedIds.has(p.id) && !rejectedIds.has(p.id));

  function handleApprove(id: number) {
    setPublishedIds((prev) => { const s = new Set(prev); s.add(id); return s; });
    setConfirmingId(null);
  }

  function handleReject(id: number) {
    setRejectedIds((prev) => { const s = new Set(prev); s.add(id); return s; });
    setRejectingId(null);
    setRejectReason("");
  }

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "32px 32px 24px" }}>
        <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--text-muted)" }}>
          Approvals
        </p>
        <h1 className="font-playfair italic font-normal text-white" style={{ fontSize: "32px", marginTop: "4px" }}>
          Client Post Approvals
        </h1>
        <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
          Review and approve posts submitted by brand clients before they go live.
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          margin: "0 32px 0",
          display: "flex",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {([
          { key: "pending",  label: `Pending (${pendingItems.length})` },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Rejected" },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="font-montserrat"
              style={{
                padding: "10px 20px",
                background: "none",
                border: "none",
                cursor: "pointer",
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: "-1px",
                color: active ? "var(--accent)" : "var(--text-muted)",
                fontSize: "13px",
                fontWeight: active ? 600 : 400,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── PENDING ── */}
      {activeTab === "pending" && (
        <div style={{ padding: "24px 32px 32px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {pendingItems.length === 0 && (
            <div style={{ padding: "60px 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <CheckCircle size={40} color="var(--text-muted)" strokeWidth={1} />
              <p className="font-playfair italic font-normal text-white" style={{ fontSize: "18px", marginTop: "16px" }}>
                All caught up
              </p>
              <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
                No posts pending approval.
              </p>
            </div>
          )}

          {pendingItems.map((post) => (
            <div
              key={post.id}
              style={{ background: "var(--surface)", borderRadius: "12px", padding: "24px", borderLeft: "3px solid var(--accent)" }}
            >
              {/* Top row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span
                  className="font-montserrat font-semibold uppercase"
                  style={{ fontSize: "10px", letterSpacing: "0.10em", background: "var(--surface-2)", color: "var(--accent)", padding: "4px 10px", borderRadius: "20px" }}
                >
                  {post.client}
                </span>
                <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Submitted {post.submittedAgo}
                </span>
              </div>

              {/* Title */}
              <h2 className="font-playfair italic font-normal text-white" style={{ fontSize: "20px", marginTop: "14px" }}>
                {post.title}
              </h2>

              {/* Type pill */}
              <div style={{ marginTop: "6px" }}>
                <span
                  className="font-montserrat font-semibold uppercase"
                  style={{ fontSize: "9px", letterSpacing: "0.10em", background: "var(--text-muted)", color: "var(--accent)", padding: "3px 10px", borderRadius: "20px" }}
                >
                  {post.type}
                </span>
              </div>

              {/* Preview */}
              <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, marginTop: "12px" }}>
                {post.preview}
              </p>

              {/* Cover image */}
              <div style={{ marginTop: "14px" }}>
                {post.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.coverImage} alt="Cover" style={{ borderRadius: "8px", maxHeight: "140px", width: "auto" }} />
                ) : (
                  <div
                    style={{
                      background: "var(--surface-2)",
                      borderRadius: "8px",
                      height: "80px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      No cover image uploaded
                    </p>
                  </div>
                )}
              </div>

              {/* Details row */}
              <div style={{ marginTop: "14px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
                {[
                  { label: "Section",       value: post.section },
                  { label: "Campaign Type", value: post.type },
                  { label: "Apply Link",    value: post.applyLink },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                      {label}
                    </p>
                    <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--accent)", marginTop: "2px" }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Reject inline form */}
              {rejectingId === post.id && (
                <div
                  style={{
                    marginTop: "16px",
                    background: "rgba(192,57,43,0.08)",
                    borderRadius: "8px",
                    padding: "16px",
                    border: "1px solid rgba(192,57,43,0.2)",
                  }}
                >
                  <p className="font-montserrat font-medium" style={{ fontSize: "12px", color: "var(--accent)", marginBottom: "8px" }}>
                    Reason for rejection (sent to client)
                  </p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain why this post is being rejected..."
                    rows={3}
                    className="font-montserrat font-normal"
                    style={{
                      width: "100%",
                      background: "var(--surface-2)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      color: "var(--text)",
                      fontSize: "13px",
                      outline: "none",
                      resize: "none",
                      caretColor: "var(--accent)",
                    }}
                  />
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <button
                      onClick={() => { setRejectingId(null); setRejectReason(""); }}
                      className="font-montserrat font-semibold"
                      style={{ height: "36px", padding: "0 14px", borderRadius: "8px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "var(--text-muted)", fontSize: "12px", cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReject(post.id)}
                      className="font-montserrat font-semibold"
                      style={{ height: "36px", padding: "0 14px", borderRadius: "8px", background: "#C0392B", border: "none", color: "var(--text)", fontSize: "12px", cursor: "pointer" }}
                    >
                      Send Rejection
                    </button>
                  </div>
                </div>
              )}

              {/* Approve confirm */}
              {confirmingId === post.id && (
                <div
                  style={{
                    marginTop: "16px",
                    background: "rgba(39,174,96,0.08)",
                    borderRadius: "8px",
                    padding: "16px",
                    border: "1px solid rgba(39,174,96,0.2)",
                  }}
                >
                  <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "12px" }}>
                    This will publish the post immediately and notify all creators.
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="font-montserrat font-semibold"
                      style={{ height: "36px", padding: "0 14px", borderRadius: "8px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "var(--text-muted)", fontSize: "12px", cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleApprove(post.id)}
                      className="font-montserrat font-semibold"
                      style={{ height: "36px", padding: "0 14px", borderRadius: "8px", background: "#27AE60", border: "none", color: "var(--text)", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <CheckCircle size={14} strokeWidth={1.5} />
                      Confirm Publish
                    </button>
                  </div>
                </div>
              )}

              {/* Action row (hidden when reject or confirm form is open) */}
              {rejectingId !== post.id && confirmingId !== post.id && (
                <div
                  style={{
                    marginTop: "20px",
                    paddingTop: "16px",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => setRejectingId(post.id)}
                    className="font-montserrat font-semibold"
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#C0392B", background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.4)", padding: "0 16px", height: "40px", borderRadius: "8px", cursor: "pointer" }}
                  >
                    <X size={14} strokeWidth={1.5} />
                    Reject
                  </button>
                  <button
                    className="font-montserrat font-semibold"
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--accent)", background: "transparent", border: "1px solid rgba(228,220,209,0.3)", padding: "0 16px", height: "40px", borderRadius: "8px", cursor: "pointer" }}
                  >
                    <PenLine size={14} strokeWidth={1.5} />
                    Edit Post
                  </button>
                  <button
                    onClick={() => setConfirmingId(post.id)}
                    className="font-montserrat font-semibold"
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--bg)", background: "var(--accent)", border: "none", padding: "0 20px", height: "40px", borderRadius: "8px", cursor: "pointer" }}
                  >
                    <CheckCircle size={14} strokeWidth={1.5} />
                    Approve &amp; Publish
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── APPROVED ── */}
      {activeTab === "approved" && (
        <div style={{ padding: "24px 32px 32px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {APPROVED_EXAMPLE.map((post) => (
            <div
              key={post.id}
              style={{ background: "var(--surface)", borderRadius: "12px", padding: "24px", borderLeft: "3px solid #27AE60" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="font-montserrat font-semibold uppercase" style={{ fontSize: "10px", letterSpacing: "0.10em", background: "var(--surface-2)", color: "var(--accent)", padding: "4px 10px", borderRadius: "20px" }}>
                  {post.client}
                </span>
                <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Approved {post.approvedAgo} by {post.approvedBy}
                </span>
              </div>
              <h2 className="font-playfair italic font-normal text-white" style={{ fontSize: "20px", marginTop: "14px" }}>
                {post.title}
              </h2>
              <div style={{ marginTop: "6px" }}>
                <span className="font-montserrat font-semibold uppercase" style={{ fontSize: "9px", letterSpacing: "0.10em", background: "var(--text-muted)", color: "var(--accent)", padding: "3px 10px", borderRadius: "20px" }}>
                  {post.type}
                </span>
              </div>
              <div style={{ marginTop: "16px" }}>
                <button className="font-montserrat font-semibold" style={{ fontSize: "11px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  View live campaign →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── REJECTED ── */}
      {activeTab === "rejected" && (
        <div style={{ padding: "24px 32px 32px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {REJECTED_EXAMPLE.map((post) => (
            <div
              key={post.id}
              style={{ background: "var(--surface)", borderRadius: "12px", padding: "24px", borderLeft: "3px solid #C0392B" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="font-montserrat font-semibold uppercase" style={{ fontSize: "10px", letterSpacing: "0.10em", background: "var(--surface-2)", color: "var(--accent)", padding: "4px 10px", borderRadius: "20px" }}>
                  {post.client}
                </span>
                <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Rejected {post.rejectedAgo}
                </span>
              </div>
              <h2 className="font-playfair italic font-normal text-white" style={{ fontSize: "20px", marginTop: "14px" }}>
                {post.title}
              </h2>
              <div style={{ marginTop: "6px" }}>
                <span className="font-montserrat font-semibold uppercase" style={{ fontSize: "9px", letterSpacing: "0.10em", background: "var(--text-muted)", color: "var(--accent)", padding: "3px 10px", borderRadius: "20px" }}>
                  {post.type}
                </span>
              </div>
              <div style={{ marginTop: "12px", background: "rgba(192,57,43,0.08)", borderRadius: "8px", padding: "12px", border: "1px solid rgba(192,57,43,0.15)" }}>
                <p className="font-montserrat font-bold uppercase" style={{ fontSize: "9px", letterSpacing: "0.08em", color: "#C0392B", marginBottom: "4px" }}>
                  Rejection Reason
                </p>
                <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6 }}>
                  {post.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`textarea::placeholder { color: var(--text-muted); }`}</style>
    </div>
  );
}
