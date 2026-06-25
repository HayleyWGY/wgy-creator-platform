"use client";

import {
  Heart, MessageCircle, Bookmark, Bell, Mic, ArrowLeft,
  Globe, Music2, Camera, Info, CalendarDays, Clock, MapPin,
} from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ASA_GUIDELINES_URL } from "@/lib/constants";

interface Campaign {
  id: string;
  slug: string;
  brandName: string;
  brandInitials: string;
  brandLogoUrl: string | null;
  coverImageUrl: string | null;
  campaignType: string;
  title: string;
  brandDescription: string | null;
  brandWebsite: string | null;
  brandInstagram: string | null;
  brandTikTok: string | null;
  opportunityDescription: string | null;
  deliverables: string[] | null;
  applyLinkUrl: string;
  spotsRemaining: number | null;
  paymentAmount: string | null;
  paymentTerms: string | null;
  eventDate: string | null;
  eventTime: string | null;
  eventLocation: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

const COMMENTS = [
  { initials: "LE", name: "Laura E",   tags: ["VitD"], extra: "+12", body: "I've applied!",                                  meta: "3h ago" },
  { initials: "LT", name: "Libbie T",  tags: ["PERL"], extra: "+7",  body: "I have applied, I'm 22 so not sure if I'll get it!", meta: "1d ago" },
];

function getAge(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "Just now";
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function Divider() {
  return <div className="mx-5 my-5" style={{ height: "1px", background: "var(--border)" }} />;
}

export default function CampaignDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading]   = useState(true);
  const [liked, setLiked]           = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bellActive, setBellActive] = useState(false);
  const [comment, setComment]       = useState("");

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/campaigns/${slug}`)
      .then((r) => r.json())
      .then((data) => setCampaign(data.campaign ?? null))
      .catch(() => setCampaign(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-montserrat" style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="font-montserrat" style={{ fontSize: "13px", color: "var(--text-muted)" }}>Campaign not found.</p>
        <Link href="/opportunities" className="font-montserrat font-semibold" style={{ fontSize: "13px", color: "var(--accent)", textDecoration: "none" }}>
          ← Back to Opportunities
        </Link>
      </div>
    );
  }

  const ct = campaign.campaignType?.toLowerCase() ?? "";
  const isEvent       = ct === "event";
  const isPaid        = ct === "paid" || ct === "paid collab";
  const isAppPartners = ct === "app-partners" || ct === "app partners";

  const showDeliverables = !isEvent && !isAppPartners;

  const brandLinks = [
    { label: "Website",   icon: Globe,  url: campaign.brandWebsite   },
    { label: "Instagram", icon: Camera, url: campaign.brandInstagram },
    { label: "TikTok",    icon: Music2, url: campaign.brandTikTok    },
  ].filter((l) => !!l.url) as { label: string; icon: typeof Globe; url: string }[];

  return (
    <div className="min-h-screen pb-[160px]">
      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="relative w-full aspect-video" style={{ background: "linear-gradient(140deg, var(--img-a), var(--img-b))" }}>
        {campaign.coverImageUrl && (
          <Image src={campaign.coverImageUrl} alt={campaign.brandName} fill style={{ objectFit: "cover" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.66) 40%, rgba(0,0,0,0.78) 100%)" }} />

        <Link
          href="/opportunities"
          className="absolute top-4 left-4 z-10 flex items-center justify-center"
          style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(0,0,0,0.4)" }}
          aria-label="Back to Opportunities"
        >
          <ArrowLeft size={16} color="#ffffff" />
        </Link>

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-montserrat text-white text-center" style={{ fontSize: "22px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.005em", padding: "0 24px" }}>
            {campaign.brandName}
          </span>
        </div>

        {/* Brand logo circle */}
        <div
          className="absolute flex items-center justify-center"
          style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#ffffff", bottom: "-40px", left: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.3)", overflow: "hidden" }}
        >
          {campaign.brandLogoUrl ? (
            <Image src={campaign.brandLogoUrl} alt={campaign.brandName} fill style={{ objectFit: "cover" }} />
          ) : (
            <span className="font-montserrat font-semibold" style={{ fontSize: "20px", color: "#706b6b" }}>
              {campaign.brandInitials}
            </span>
          )}
        </div>
      </div>

      {/* ── Campaign info ────────────────────────────────── */}
      <div className="px-5 flex flex-col gap-3" style={{ paddingTop: "52px", paddingBottom: "4px" }}>
        <span
          className="font-montserrat uppercase self-start"
          style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.12em", background: "var(--beige)", color: "#111111", padding: "5px 10px", borderRadius: "var(--radius-pill)" }}
        >
          {campaign.campaignType}
        </span>

        <h1 className="font-montserrat" style={{ fontSize: "22px", fontWeight: 800, lineHeight: 1.2, color: "var(--text)", margin: 0 }}>
          {campaign.title}
        </h1>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-none" style={{ background: "var(--beige)" }}>
            <span className="font-montserrat font-bold" style={{ fontSize: "8px", color: "#111111" }}>WG</span>
          </div>
          <span className="font-montserrat" style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)" }}>WGY LTD</span>
          <span className="font-montserrat uppercase" style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", background: "var(--beige)", color: "#111111", padding: "2px 8px", borderRadius: "var(--radius-pill)" }}>Admin</span>
          <span className="font-montserrat ml-auto" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{getAge(campaign.createdAt)}</span>
        </div>
      </div>

      {/* ── Event Details Card (events only) ─────────────── */}
      {isEvent && (campaign.eventDate || campaign.eventTime || campaign.eventLocation) && (
        <>
          <div className="px-5 mt-4">
            <div
              style={{
                background: "var(--surface)",
                borderRadius: "var(--radius-card)",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                border: "1px solid var(--border)",
              }}
            >
              {campaign.eventDate && (
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <CalendarDays size={18} strokeWidth={1.5} style={{ flexShrink: 0, color: "var(--accent)" }} />
                  <span className="font-montserrat" style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
                    {formatEventDate(campaign.eventDate)}
                  </span>
                </div>
              )}
              {campaign.eventTime && (
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <Clock size={18} strokeWidth={1.5} style={{ flexShrink: 0, color: "var(--accent)" }} />
                  <span className="font-montserrat" style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
                    {campaign.eventTime}
                  </span>
                </div>
              )}
              {campaign.eventLocation && (
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <MapPin size={18} strokeWidth={1.5} style={{ flexShrink: 0, color: "var(--accent)" }} />
                  <span className="font-montserrat" style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
                    {campaign.eventLocation}
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <Divider />

      {/* ── About the Brand / Event ───────────────────────── */}
      {campaign.brandDescription && (
        <>
          <div className="px-5 flex flex-col gap-3">
            <span className="text-section-label">{isEvent ? "About the Event" : "About the Brand"}</span>
            <p className="font-montserrat leading-[1.7]" style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}>
              {campaign.brandDescription}
            </p>
            {brandLinks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {brandLinks.map(({ label, icon: Icon, url }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-[6px]"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 14px" }}
                  >
                    <Icon size={14} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                    <span className="font-montserrat uppercase" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent)" }}>
                      {label}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
          <Divider />
        </>
      )}

      {/* ── The Opportunity ──────────────────────────────── */}
      {campaign.opportunityDescription && (
        <>
          <div className="px-5 flex flex-col gap-3">
            <span className="text-section-label">The Opportunity</span>
            <p className="font-montserrat leading-[1.7]" style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}>
              {campaign.opportunityDescription}
            </p>
          </div>
          <Divider />
        </>
      )}

      {/* ── Deliverables (PR/Gifted + Paid only) ─────────── */}
      {showDeliverables && campaign.deliverables && campaign.deliverables.length > 0 && (
        <>
          <div className="px-5 flex flex-col gap-3">
            <span className="text-section-label">Deliverables &amp; Requests</span>
            <ul className="flex flex-col gap-2">
              {campaign.deliverables.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="flex-none mt-[6px] w-[5px] h-[5px] rounded-full" style={{ background: "var(--accent)" }} />
                  <span className="font-montserrat leading-[1.7]" style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <Divider />
        </>
      )}

      {/* ── Payment (Paid only) ───────────────────────────── */}
      {isPaid && (campaign.paymentAmount || campaign.paymentTerms) && (
        <>
          <div className="px-5 flex flex-col gap-4">
            <span className="text-section-label">Payment</span>
            {campaign.paymentAmount && (
              <div>
                <span className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.08em", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Payment Amount
                </span>
                <div style={{ background: "var(--surface-2)", borderRadius: "8px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="font-montserrat" style={{ fontSize: "18px", fontWeight: 800, color: "var(--accent)" }}>£</span>
                  <span className="font-montserrat" style={{ fontSize: "20px", fontWeight: 900, letterSpacing: "-0.04em", color: "var(--text)" }}>
                    {campaign.paymentAmount}
                  </span>
                </div>
              </div>
            )}
            {campaign.paymentTerms && (
              <div>
                <span className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.08em", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Payment Terms
                </span>
                <div style={{ background: "var(--surface-2)", borderRadius: "8px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <Clock size={18} strokeWidth={1.5} style={{ flexShrink: 0, color: "var(--accent)" }} />
                  <span className="font-montserrat" style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
                    {campaign.paymentTerms}
                  </span>
                </div>
              </div>
            )}
          </div>
          <Divider />
        </>
      )}

      {/* ── Apply ────────────────────────────────────────── */}
      {campaign.applyLinkUrl && (
        <div className="px-5 flex flex-col gap-2">
          <a
            href={campaign.applyLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center font-montserrat uppercase transition-opacity active:opacity-80"
            style={{ height: "48px", borderRadius: "var(--radius-pill)", background: "var(--pill-bg)", color: "var(--pill-text)", fontSize: "12px", fontWeight: 800, letterSpacing: "0.09em", textDecoration: "none" }}
          >
            {isEvent ? "Register for This Event" : "Apply for This Campaign"}
          </a>
          {campaign.spotsRemaining != null && (
            <p className="font-montserrat text-center" style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)" }}>
              {campaign.spotsRemaining} spots remaining
            </p>
          )}
        </div>
      )}

      <Divider />

      {/* ── Engagement row ───────────────────────────────── */}
      <div className="px-5 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setLiked(!liked)} className="flex items-center gap-1.5" aria-label="Like">
            <Heart size={18} strokeWidth={1.5} fill={liked ? "var(--accent)" : "none"} style={{ color: liked ? "var(--accent)" : "var(--text-muted)" }} />
            <span className="font-montserrat" style={{ fontSize: "12px", color: liked ? "var(--accent)" : "var(--text-muted)" }}>{campaign.likesCount}</span>
          </button>
          <button className="flex items-center gap-1.5" aria-label="Comments">
            <MessageCircle size={18} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />
            <span className="font-montserrat" style={{ fontSize: "12px", color: "var(--text-muted)" }}>{campaign.commentsCount}</span>
          </button>
          <button onClick={() => setBookmarked(!bookmarked)} aria-label="Bookmark">
            <Bookmark size={18} strokeWidth={1.5} fill={bookmarked ? "var(--accent)" : "none"} style={{ color: bookmarked ? "var(--accent)" : "var(--text-muted)" }} />
          </button>
          <button onClick={() => setBellActive(!bellActive)} aria-label="Remind me">
            <Bell size={18} strokeWidth={1.5} style={{ color: bellActive ? "var(--accent)" : "var(--text-muted)" }} />
          </button>
        </div>

        <p className="font-montserrat" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{campaign.commentsCount} comments</p>

        <div className="flex flex-col gap-4">
          {COMMENTS.map((c, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-none" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <span className="font-montserrat font-semibold" style={{ fontSize: "9px", color: "var(--text)" }}>{c.initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <span className="font-montserrat" style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>{c.name}</span>
                  {c.tags.map((tag) => (
                    <span key={tag} className="font-montserrat uppercase" style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.10em", background: "var(--beige)", color: "#111111", padding: "2px 8px", borderRadius: "var(--radius-pill)" }}>{tag}</span>
                  ))}
                  <span className="font-montserrat" style={{ fontSize: "9px", color: "var(--text-muted)", border: "1px solid var(--border-strong)", padding: "2px 8px", borderRadius: "var(--radius-pill)" }}>{c.extra}</span>
                </div>
                <p className="font-montserrat leading-[1.6] mb-1" style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>{c.body}</p>
                <p className="font-montserrat" style={{ fontSize: "10px", color: "var(--text-muted)" }}>{c.meta} · Like · Reply</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Divider />

      {/* ── ASA Footer ───────────────────────────────────── */}
      <div className="flex flex-col gap-1" style={{ padding: "16px 20px 32px" }}>
        <div className="flex items-start gap-2">
          <Info size={13} strokeWidth={1.5} className="flex-none mt-[1px]" style={{ color: "var(--text-muted)" }} />
          <p className="font-montserrat leading-[1.6]" style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)" }}>
            UK advertising disclosure guidelines apply to all sponsored content.
          </p>
        </div>
        <a href={ASA_GUIDELINES_URL} target="_blank" rel="noopener noreferrer" className="font-montserrat font-semibold" style={{ fontSize: "11px", color: "var(--accent)", textDecoration: "none", paddingLeft: "21px" }}>
          ASA Guidelines →
        </a>
      </div>

      {/* ── Sticky comment input ─────────────────────────── */}
      <div
        className="fixed z-40 flex items-center gap-3 px-5 py-3"
        style={{ bottom: "80px", background: "var(--surface)", borderTop: "1px solid var(--border)", width: "100%", maxWidth: "390px", left: "50%", transform: "translateX(-50%)" }}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-none" style={{ background: "var(--beige)" }}>
          <span className="font-montserrat font-semibold" style={{ fontSize: "9px", color: "#111111" }}>HW</span>
        </div>
        <div className="flex-1 flex items-center gap-2 px-4 py-2" style={{ background: "var(--surface-2)", borderRadius: "var(--radius-pill)" }}>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What are your thoughts?"
            className="flex-1 bg-transparent outline-none font-montserrat"
            style={{ fontSize: "12px", fontWeight: 500, color: "var(--text)" }}
          />
          <Mic size={14} style={{ color: "var(--text-muted)" }} />
        </div>
        <style>{`input::placeholder { color: var(--text-muted); }`}</style>
      </div>
    </div>
  );
}
