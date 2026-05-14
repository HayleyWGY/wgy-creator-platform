"use client";

import { useState, useEffect } from "react";
import { Search, Heart, MessageCircle, CalendarDays } from "lucide-react";
import Link from "next/link";

interface Campaign {
  id: string;
  slug: string;
  brandName: string;
  campaignType: string;
  title: string;
  likesCount: number;
  commentsCount: number;
  status: string;
  createdAt: string;
  sectionName: string;
  sectionSlug: string;
  eventDate?: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function StatusPill({ status }: { status: string }) {
  if (status === "published") {
    return (
      <span
        className="font-montserrat font-semibold uppercase"
        style={{ fontSize: "9px", letterSpacing: "0.10em", background: "#e4dcd1", color: "#222222", padding: "3px 8px", borderRadius: "20px" }}
      >
        Live
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span
        className="font-montserrat font-semibold uppercase"
        style={{ fontSize: "9px", letterSpacing: "0.10em", border: "1px solid rgba(255,255,255,0.15)", color: "#706b6b", padding: "3px 8px", borderRadius: "20px" }}
      >
        Draft
      </span>
    );
  }
  return (
    <span
      className="font-montserrat font-semibold uppercase"
      style={{ fontSize: "9px", letterSpacing: "0.10em", background: "#333333", color: "#706b6b", padding: "3px 8px", borderRadius: "20px" }}
    >
      Closed
    </span>
  );
}

function SectionPill({ section }: { section: string }) {
  return (
    <span
      className="font-montserrat font-semibold uppercase"
      style={{ fontSize: "9px", letterSpacing: "0.08em", background: "#333333", color: "#e4dcd1", padding: "3px 8px", borderRadius: "20px" }}
    >
      {section}
    </span>
  );
}

function TypePill({ type }: { type: string }) {
  const t = type?.toLowerCase() ?? "";
  if (t === "paid" || t === "paid collab") {
    return <span className="font-montserrat font-bold uppercase" style={{ fontSize: "8px", letterSpacing: "0.08em", background: "rgba(39,174,96,0.15)", color: "#27AE60", padding: "2px 7px", borderRadius: "20px" }}>Paid</span>;
  }
  if (t === "event") {
    return <span className="font-montserrat font-bold uppercase" style={{ fontSize: "8px", letterSpacing: "0.08em", background: "rgba(155,126,86,0.2)", color: "#9b7e56", padding: "2px 7px", borderRadius: "20px" }}>Event</span>;
  }
  if (t === "app-partners" || t === "app partners") {
    return <span className="font-montserrat font-bold uppercase" style={{ fontSize: "8px", letterSpacing: "0.08em", background: "rgba(61,53,80,0.5)", color: "#e4dcd1", padding: "2px 7px", borderRadius: "20px" }}>Affiliate</span>;
  }
  return null;
}

function CloseModal({
  campaignName,
  onConfirm,
  onCancel,
}: {
  campaignName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
      onClick={onCancel}
    >
      <div
        style={{ background: "#2a2a2a", borderRadius: "12px", padding: "28px", maxWidth: "420px", width: "100%", margin: "0 20px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "#C0392B" }}>
          Close Campaign
        </p>
        <h2 className="font-playfair italic font-normal text-white" style={{ fontSize: "20px", marginTop: "8px" }}>
          Close &ldquo;{campaignName}&rdquo;?
        </h2>
        <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "#c8c3bc", marginTop: "12px", lineHeight: 1.6 }}>
          Creators will still see it but the apply button will be hidden. This cannot be automatically undone.
        </p>
        <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
          <button
            onClick={onCancel}
            className="font-montserrat font-semibold"
            style={{ flex: 1, height: "40px", borderRadius: "8px", background: "transparent", border: "1px solid rgba(228,220,209,0.25)", color: "#e4dcd1", fontSize: "13px", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="font-montserrat font-semibold"
            style={{ flex: 1, height: "40px", borderRadius: "8px", background: "#C0392B", border: "none", color: "#ffffff", fontSize: "13px", cursor: "pointer" }}
          >
            Close Campaign
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch]       = useState("");
  const [closingId, setClosingId] = useState<string | null>(null);

  function loadCampaigns() {
    setLoading(true);
    fetch("/api/campaigns?adminAll=true")
      .then((r) => r.json())
      .then((data) => setCampaigns(data.campaigns ?? []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadCampaigns(); }, []);

  async function handleClose(id: string) {
    await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: "closed" } : c));
    setClosingId(null);
  }

  async function handlePublish(id: string) {
    await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: "published" } : c));
  }

  const filtered = campaigns.filter((c) => {
    const matchesTab =
      activeTab === "All" ||
      (activeTab === "Live"   && c.status === "published") ||
      (activeTab === "Draft"  && c.status === "draft") ||
      (activeTab === "Closed" && c.status === "closed");
    const matchesSearch =
      !search.trim() ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.brandName.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const counts = {
    All:    campaigns.length,
    Live:   campaigns.filter((c) => c.status === "published").length,
    Draft:  campaigns.filter((c) => c.status === "draft").length,
    Closed: campaigns.filter((c) => c.status === "closed").length,
  };

  const closingCampaign = closingId ? campaigns.find((c) => c.id === closingId) : null;

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "32px 32px 0", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "#706b6b" }}>Campaigns</p>
          <h1 className="font-playfair italic font-normal text-white" style={{ fontSize: "32px", marginTop: "4px" }}>Campaign Management</h1>
        </div>
        <Link
          href="/admin/campaigns/new"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: "44px", padding: "0 20px", background: "#e4dcd1", borderRadius: "8px", textDecoration: "none" }}
        >
          <span className="font-montserrat font-semibold" style={{ fontSize: "13px", color: "#222222" }}>+ New Campaign</span>
        </Link>
      </div>

      {/* Status tabs */}
      <div style={{ padding: "24px 32px 0", display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {(["All", "Live", "Draft", "Closed"] as const).map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="font-montserrat"
              style={{
                padding: "10px 20px",
                background: "none",
                border: "none",
                cursor: "pointer",
                borderBottom: active ? "2px solid #e4dcd1" : "2px solid transparent",
                marginBottom: "-1px",
                color: active ? "#e4dcd1" : "#706b6b",
                fontSize: "13px",
                fontWeight: active ? 600 : 400,
                transition: "color 0.15s",
              }}
            >
              {tab} ({counts[tab]})
            </button>
          );
        })}
      </div>

      {/* Filter row */}
      <div style={{ padding: "16px 32px", display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "320px" }}>
          <Search size={15} color="#706b6b" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="font-montserrat font-normal"
            style={{ width: "100%", height: "44px", background: "#2a2a2a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", paddingLeft: "36px", paddingRight: "16px", color: "#ffffff", fontSize: "13px", outline: "none", caretColor: "#e4dcd1" }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: "0 32px 32px" }}>
        <div style={{ background: "#2a2a2a", borderRadius: "12px", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ background: "#1a1a1a", padding: "12px 20px", display: "grid", gridTemplateColumns: "2.5fr 1fr 0.6fr 0.8fr 1fr 0.8fr 1fr", gap: "12px", alignItems: "center" }}>
            {["Campaign", "Section", "Type", "Status", "Engagement", "Created", "Actions"].map((col) => (
              <span key={col} className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.10em", color: "#706b6b" }}>{col}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: "32px 20px", textAlign: "center" }}>
              <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "#706b6b" }}>Loading campaigns...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center" }}>
              <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "#706b6b" }}>No campaigns found.</p>
            </div>
          ) : (
            filtered.map((c, i) => (
              <div
                key={c.id}
                style={{
                  padding: "16px 20px",
                  display: "grid",
                  gridTemplateColumns: "2.5fr 1fr 0.6fr 0.8fr 1fr 0.8fr 1fr",
                  gap: "12px",
                  alignItems: "center",
                  borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                {/* Campaign cell */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "6px", background: "#333333", flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p className="font-montserrat font-semibold" style={{ fontSize: "13px", color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.title}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                      <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b" }}>{c.brandName}</p>
                      {(c.campaignType?.toLowerCase() === "event") && c.eventDate && (
                        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          <CalendarDays size={12} color="#706b6b" strokeWidth={1.5} />
                          <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b" }}>
                            {new Date(c.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div><SectionPill section={c.sectionName} /></div>
                <div><TypePill type={c.campaignType} /></div>
                <div><StatusPill status={c.status} /></div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="font-montserrat font-normal" style={{ fontSize: "12px", color: "#706b6b", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Heart size={11} /> {c.likesCount}
                  </span>
                  <span className="font-montserrat font-normal" style={{ fontSize: "12px", color: "#706b6b", display: "flex", alignItems: "center", gap: "4px" }}>
                    <MessageCircle size={11} /> {c.commentsCount}
                  </span>
                </div>

                <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "#706b6b" }}>
                  {formatDate(c.createdAt)}
                </p>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                  <Link
                    href={`/admin/campaigns/${c.id}/edit`}
                    className="font-montserrat font-semibold"
                    style={{ fontSize: "11px", color: "#e4dcd1", textDecoration: "none" }}
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/opportunities/${c.slug}`}
                    target="_blank"
                    className="font-montserrat font-semibold"
                    style={{ fontSize: "11px", color: "#706b6b", textDecoration: "none" }}
                  >
                    View
                  </Link>
                  {c.status === "published" && (
                    <button
                      onClick={() => setClosingId(c.id)}
                      className="font-montserrat font-semibold"
                      style={{ fontSize: "11px", color: "#C0392B", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      Close
                    </button>
                  )}
                  {c.status === "draft" && (
                    <button
                      onClick={() => handlePublish(c.id)}
                      className="font-montserrat font-semibold"
                      style={{ fontSize: "11px", color: "#27AE60", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      Publish
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Count */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px" }}>
          <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "#706b6b" }}>
            Showing {filtered.length} of {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Close modal */}
      {closingCampaign && (
        <CloseModal
          campaignName={closingCampaign.title}
          onConfirm={() => handleClose(closingCampaign.id)}
          onCancel={() => setClosingId(null)}
        />
      )}

      <style>{`input::placeholder { color: #706b6b; }`}</style>
    </div>
  );
}
