"use client";

import { useState, useEffect } from "react";
import { StatusPill } from '@/components/ui/status-pill'
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
  scheduledAt: string | null;
  createdAt: string;
  sectionName: string;
  sectionSlug: string;
  eventDate?: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}


function SectionPill({ section }: { section: string }) {
  return (
    <span
      className="font-montserrat font-semibold uppercase"
      style={{ fontSize: "9px", letterSpacing: "0.08em", background: "var(--surface-2)", color: "var(--accent)", padding: "3px 8px", borderRadius: "20px" }}
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
    return <span className="font-montserrat font-bold uppercase" style={{ fontSize: "8px", letterSpacing: "0.08em", background: "rgba(155,126,86,0.2)", color: "var(--gold-wgy)", padding: "2px 7px", borderRadius: "20px" }}>Event</span>;
  }
  if (t === "app-partners" || t === "app partners") {
    return <span className="font-montserrat font-bold uppercase" style={{ fontSize: "8px", letterSpacing: "0.08em", background: "rgba(61,53,80,0.5)", color: "var(--accent)", padding: "2px 7px", borderRadius: "20px" }}>Affiliate</span>;
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
        style={{ background: "var(--surface)", borderRadius: "12px", padding: "28px", maxWidth: "420px", width: "100%", margin: "0 20px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "#C0392B" }}>
          Close Campaign
        </p>
        <h2 className="admin-title" style={{ fontSize: "20px", marginTop: "8px" }}>
          Close &ldquo;{campaignName}&rdquo;?
        </h2>
        <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "12px", lineHeight: 1.6 }}>
          Creators will still see it but the apply button will be hidden. This cannot be automatically undone.
        </p>
        <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
          <button
            onClick={onCancel}
            className="font-montserrat font-semibold"
            style={{ flex: 1, height: "40px", borderRadius: "8px", background: "transparent", border: "1px solid rgba(228,220,209,0.25)", color: "var(--accent)", fontSize: "13px", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="font-montserrat font-semibold"
            style={{ flex: 1, height: "40px", borderRadius: "8px", background: "#C0392B", border: "none", color: "var(--text)", fontSize: "13px", cursor: "pointer" }}
          >
            Close Campaign
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const PAGE_SIZE = 50;
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]     = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch]       = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [closingId, setClosingId] = useState<string | null>(null);
  // Per-status totals from the server, so tab badges reflect the whole library
  // rather than just the loaded page.
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Tab label -> stored status. "All" sends no status filter.
  const TAB_STATUS: Record<string, string> = {
    Live: "published", Scheduled: "scheduled", Draft: "draft", Closed: "closed",
  };

  const campaignsUrl = (offset: number) => {
    let url = `/api/campaigns?adminAll=true&limit=${PAGE_SIZE}&offset=${offset}`;
    // Search AND the status tab both run on the server, spanning every
    // campaign rather than just the loaded rows.
    if (debouncedSearch) url += `&q=${encodeURIComponent(debouncedSearch)}`;
    if (TAB_STATUS[activeTab]) url += `&status=${TAB_STATUS[activeTab]}`;
    return url;
  };

  function loadCampaigns() {
    setLoading(true);
    fetch(campaignsUrl(0))
      .then((r) => r.json())
      .then((data) => { setCampaigns(data.campaigns ?? []); setHasMore(!!data.hasMore); if (data.counts) setStatusCounts(data.counts); })
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }

  function loadMore() {
    setLoadingMore(true);
    fetch(campaignsUrl(campaigns.length))
      .then((r) => r.json())
      .then((data) => { setCampaigns((prev) => [...prev, ...(data.campaigns ?? [])]); setHasMore(!!data.hasMore); })
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false));
  }

  useEffect(() => { loadCampaigns(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [debouncedSearch, activeTab]);

  async function handleClose(id: string) {
    await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed", mode: "status" }),
    });
    setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: "closed" } : c));
    setClosingId(null);
  }

  async function handlePublish(id: string) {
    await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published", mode: "status" }),
    });
    setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: "published" } : c));
  }

  // Search AND the status tab are applied on the server, so the loaded list is
  // already the matches for the active tab.
  const filtered = campaigns;

  // Tab badges come from the server's whole-library status counts.
  const counts = {
    All:       statusCounts.All ?? 0,
    Live:      statusCounts.published ?? 0,
    Scheduled: statusCounts.scheduled ?? 0,
    Draft:     statusCounts.draft ?? 0,
    Closed:    statusCounts.closed ?? 0,
  };

  const closingCampaign = closingId ? campaigns.find((c) => c.id === closingId) : null;

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "32px 32px 0", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--text-muted)" }}>Campaigns</p>
          <h1 className="admin-title" style={{ fontSize: "32px", marginTop: "4px" }}>Campaign Management</h1>
        </div>
        <Link
          href="/admin/campaigns/new"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: "44px", padding: "0 20px", background: "var(--accent)", borderRadius: "8px", textDecoration: "none" }}
        >
          <span className="font-montserrat font-semibold" style={{ fontSize: "13px", color: "var(--bg)" }}>+ New Campaign</span>
        </Link>
      </div>

      {/* Status tabs */}
      <div style={{ padding: "24px 32px 0", display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {(["All", "Live", "Scheduled", "Draft", "Closed"] as const).map((tab) => {
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
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: "-1px",
                color: active ? "var(--accent)" : "var(--text-muted)",
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
          <Search size={15} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="font-montserrat font-normal"
            style={{ width: "100%", height: "44px", background: "var(--surface)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", paddingLeft: "36px", paddingRight: "16px", color: "var(--text)", fontSize: "13px", outline: "none", caretColor: "var(--accent)" }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: "0 32px 32px" }}>
        <div style={{ background: "var(--surface)", borderRadius: "12px", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ background: "var(--surface)", padding: "12px 20px", display: "grid", gridTemplateColumns: "2.5fr 1fr 0.6fr 0.8fr 1fr 0.8fr 1fr", gap: "12px", alignItems: "center" }}>
            {["Campaign", "Section", "Type", "Status", "Engagement", "Created", "Actions"].map((col) => (
              <span key={col} className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.10em", color: "var(--text-muted)" }}>{col}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: "32px 20px", textAlign: "center" }}>
              <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading campaigns...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center" }}>
              <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)" }}>No campaigns found.</p>
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
                  <div style={{ width: "40px", height: "40px", borderRadius: "6px", background: "var(--surface-2)", flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p className="font-montserrat font-semibold" style={{ fontSize: "13px", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.title}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                      <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{c.brandName}</p>
                      {(c.campaignType?.toLowerCase() === "event") && c.eventDate && (
                        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                          <CalendarDays size={12} color="var(--text-muted)" strokeWidth={1.5} />
                          <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            {new Date(c.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div><SectionPill section={c.sectionName} /></div>
                <div><TypePill type={c.campaignType} /></div>
                <div>
                  <StatusPill status={c.status} />
                  {c.status === "scheduled" && c.scheduledAt && (
                    <p className="font-montserrat font-normal" style={{ fontSize: "10px", color: "#e4aa55", marginTop: "4px" }}>
                      {new Date(c.scheduledAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Heart size={11} /> {c.likesCount}
                  </span>
                  <span className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <MessageCircle size={11} /> {c.commentsCount}
                  </span>
                </div>

                <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {formatDate(c.createdAt)}
                </p>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                  <Link
                    href={`/admin/campaigns/${c.id}/edit`}
                    className="font-montserrat font-semibold"
                    style={{ fontSize: "11px", color: "var(--accent)", textDecoration: "none" }}
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/opportunities/${c.slug}`}
                    target="_blank"
                    className="font-montserrat font-semibold"
                    style={{ fontSize: "11px", color: "var(--text-muted)", textDecoration: "none" }}
                  >
                    View
                  </Link>
                  <Link
                    href={`/admin/campaigns/${c.id}/comments`}
                    className="font-montserrat font-semibold"
                    style={{ fontSize: "11px", color: "var(--accent)", textDecoration: "none" }}
                  >
                    Comments
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
                  {(c.status === "draft" || c.status === "scheduled") && (
                    <button
                      onClick={() => handlePublish(c.id)}
                      className="font-montserrat font-semibold"
                      style={{ fontSize: "11px", color: "#27AE60", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      {c.status === "scheduled" ? "Publish Now" : "Publish"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Count + load more. Tab/search filter only the loaded rows, so the
            button is hidden while a filter is active to avoid confusion. */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px" }}>
          <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Showing {filtered.length} of {campaigns.length} loaded campaign{campaigns.length !== 1 ? "s" : ""}
          </p>
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="font-montserrat uppercase"
              style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.10em", padding: "8px 20px", borderRadius: "var(--radius-pill)", background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border-strong)", cursor: loadingMore ? "wait" : "pointer" }}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
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

      <style>{`input::placeholder { color: var(--text-muted); }`}</style>
    </div>
  );
}
