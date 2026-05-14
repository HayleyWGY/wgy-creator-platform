"use client";

import {
  Heart, MessageCircle, Bookmark, Bell, Mic, ArrowLeft,
  Globe, Music2, Camera, Info, CalendarDays, Clock, MapPin,
} from "lucide-react";
import { useState, useEffect } from "react";
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

const COVER_BG = "#8b6f5e";

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
  return <div className="mx-5 my-5" style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />;
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
        <p className="font-montserrat" style={{ fontSize: "13px", color: "#706b6b" }}>Loading...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="font-montserrat" style={{ fontSize: "13px", color: "#706b6b" }}>Campaign not found.</p>
        <Link href="/opportunities" className="font-montserrat font-semibold" style={{ fontSize: "13px", color: "#e4dcd1", textDecoration: "none" }}>
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
      <div className="relative w-full aspect-video" style={{ background: COVER_BG }}>
        {campaign.coverImageUrl && (
          <img src={campaign.coverImageUrl} alt={campaign.brandName} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.66) 40%, rgba(0,0,0,0.78) 100%)" }} />

        <Link
          href="/opportunities"
          className="absolute top-4 left-4 z-10 flex items-center justify-center"
          style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(0,0,0,0.4)" }}
        >
          <ArrowLeft size={16} color="#ffffff" />
        </Link>

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-playfair font-normal text-white text-center" style={{ fontSize: "22px", letterSpacing: "0.06em" }}>
            {campaign.brandName}
          </span>
        </div>

        {/* Brand logo circle */}
        <div
          className="absolute flex items-center justify-center"
          style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#ffffff", bottom: "-40px", left: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.3)", overflow: "hidden" }}
        >
          {campaign.brandLogoUrl ? (
            <img src={campaign.brandLogoUrl} alt={campaign.brandName} className="w-full h-full object-cover" />
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
          className="font-montserrat font-semibold uppercase self-start"
          style={{ fontSize: "9px", letterSpacing: "0.10em", background: "#706b6b", color: "#e4dcd1", padding: "3px 10px", borderRadius: "20px" }}
        >
          {campaign.campaignType}
        </span>

        <h1 className="font-playfair italic font-normal text-white" style={{ fontSize: "22px", lineHeight: 1.3 }}>
          {campaign.title}
        </h1>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-none" style={{ background: "#e4dcd1" }}>
            <span className="font-montserrat font-bold" style={{ fontSize: "8px", color: "#222222" }}>WG</span>
          </div>
          <span className="font-montserrat font-medium text-white" style={{ fontSize: "12px" }}>WGY LTD</span>
          <span className="font-montserrat font-semibold uppercase" style={{ fontSize: "9px", letterSpacing: "0.08em", background: "#e4dcd1", color: "#222222", padding: "2px 8px", borderRadius: "20px" }}>Admin</span>
          <span className="font-montserrat ml-auto" style={{ fontSize: "11px", color: "#706b6b" }}>{getAge(campaign.createdAt)}</span>
        </div>
      </div>

      {/* ── Event Details Card (events only) ─────────────── */}
      {isEvent && (campaign.eventDate || campaign.eventTime || campaign.eventLocation) && (
        <>
          <div className="px-5 mt-4">
            <div
              style={{
                background: "#2a2a2a",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                border: "1px solid rgba(228,220,209,0.1)",
              }}
            >
              {campaign.eventDate && (
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <CalendarDays size={18} color="#e4dcd1" strokeWidth={1.5} style={{ flexShrink: 0 }} />
                  <span className="font-montserrat font-semibold text-white" style={{ fontSize: "14px" }}>
                    {formatEventDate(campaign.eventDate)}
                  </span>
                </div>
              )}
              {campaign.eventTime && (
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <Clock size={18} color="#e4dcd1" strokeWidth={1.5} style={{ flexShrink: 0 }} />
                  <span className="font-montserrat font-semibold text-white" style={{ fontSize: "14px" }}>
                    {campaign.eventTime}
                  </span>
                </div>
              )}
              {campaign.eventLocation && (
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <MapPin size={18} color="#e4dcd1" strokeWidth={1.5} style={{ flexShrink: 0 }} />
                  <span className="font-montserrat font-semibold text-white" style={{ fontSize: "14px" }}>
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
            <p className="font-montserrat font-normal leading-[1.7]" style={{ fontSize: "13px", color: "#c8c3bc" }}>
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
                    style={{ background: "#2a2a2a", border: "1px solid rgba(228,220,209,0.15)", borderRadius: "8px", padding: "8px 14px" }}
                  >
                    <Icon size={14} color="#e4dcd1" strokeWidth={1.5} />
                    <span className="font-montserrat font-semibold uppercase" style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#e4dcd1" }}>
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
            <p className="font-montserrat font-normal leading-[1.7]" style={{ fontSize: "13px", color: "#c8c3bc" }}>
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
                  <span className="flex-none mt-[6px] w-[5px] h-[5px] rounded-full" style={{ background: "#e4dcd1" }} />
                  <span className="font-montserrat font-normal leading-[1.7]" style={{ fontSize: "13px", color: "#c8c3bc" }}>
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
                <span className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.08em", color: "#706b6b", display: "block", marginBottom: "6px" }}>
                  Payment Amount
                </span>
                <div style={{ background: "#333333", borderRadius: "8px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="font-montserrat font-semibold" style={{ fontSize: "18px", color: "#e4dcd1" }}>£</span>
                  <span className="font-montserrat font-semibold text-white" style={{ fontSize: "16px" }}>
                    {campaign.paymentAmount}
                  </span>
                </div>
              </div>
            )}
            {campaign.paymentTerms && (
              <div>
                <span className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.08em", color: "#706b6b", display: "block", marginBottom: "6px" }}>
                  Payment Terms
                </span>
                <div style={{ background: "#333333", borderRadius: "8px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <Clock size={18} color="#e4dcd1" strokeWidth={1.5} style={{ flexShrink: 0 }} />
                  <span className="font-montserrat font-semibold text-white" style={{ fontSize: "14px" }}>
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
            className="w-full flex items-center justify-center font-montserrat font-semibold transition-opacity active:opacity-80"
            style={{ height: "48px", borderRadius: "8px", background: "#e4dcd1", color: "#222222", fontSize: "13px", textDecoration: "none" }}
          >
            {isEvent ? "Register for This Event" : "Apply for This Campaign"}
          </a>
          {campaign.spotsRemaining != null && (
            <p className="font-montserrat font-normal text-center" style={{ fontSize: "11px", color: "#706b6b" }}>
              {campaign.spotsRemaining} spots remaining
            </p>
          )}
        </div>
      )}

      <Divider />

      {/* ── Engagement row ───────────────────────────────── */}
      <div className="px-5 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setLiked(!liked)} className="flex items-center gap-1.5">
            <Heart size={18} strokeWidth={1.5} fill={liked ? "#e4dcd1" : "none"} color={liked ? "#e4dcd1" : "#706b6b"} />
            <span className="font-montserrat" style={{ fontSize: "12px", color: liked ? "#e4dcd1" : "#706b6b" }}>{campaign.likesCount}</span>
          </button>
          <button className="flex items-center gap-1.5">
            <MessageCircle size={18} strokeWidth={1.5} color="#706b6b" />
            <span className="font-montserrat" style={{ fontSize: "12px", color: "#706b6b" }}>{campaign.commentsCount}</span>
          </button>
          <button onClick={() => setBookmarked(!bookmarked)}>
            <Bookmark size={18} strokeWidth={1.5} fill={bookmarked ? "#e4dcd1" : "none"} color={bookmarked ? "#e4dcd1" : "#706b6b"} />
          </button>
          <button onClick={() => setBellActive(!bellActive)}>
            <Bell size={18} strokeWidth={1.5} color={bellActive ? "#e4dcd1" : "#706b6b"} />
          </button>
        </div>

        <p className="font-montserrat font-semibold text-white" style={{ fontSize: "13px" }}>{campaign.commentsCount} comments</p>

        <div className="flex flex-col gap-4">
          {COMMENTS.map((c, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-none" style={{ background: "#2a2a2a", border: "1px solid rgba(228,220,209,0.2)" }}>
                <span className="font-montserrat font-semibold" style={{ fontSize: "9px", color: "#e4dcd1" }}>{c.initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <span className="font-montserrat font-semibold text-white" style={{ fontSize: "12px" }}>{c.name}</span>
                  {c.tags.map((tag) => (
                    <span key={tag} className="font-montserrat font-semibold uppercase" style={{ fontSize: "9px", letterSpacing: "0.10em", background: "#706b6b", color: "#e4dcd1", padding: "2px 8px", borderRadius: "20px" }}>{tag}</span>
                  ))}
                  <span className="font-montserrat" style={{ fontSize: "9px", color: "#706b6b", border: "1px solid rgba(228,220,209,0.3)", padding: "2px 8px", borderRadius: "20px" }}>{c.extra}</span>
                </div>
                <p className="font-montserrat font-normal leading-[1.6] mb-1" style={{ fontSize: "12px", color: "#c8c3bc" }}>{c.body}</p>
                <p className="font-montserrat" style={{ fontSize: "10px", color: "#706b6b" }}>{c.meta} · Like · Reply</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Divider />

      {/* ── ASA Footer ───────────────────────────────────── */}
      <div className="flex flex-col gap-1" style={{ padding: "16px 20px 32px" }}>
        <div className="flex items-start gap-2">
          <Info size={13} color="#706b6b" strokeWidth={1.5} className="flex-none mt-[1px]" />
          <p className="font-montserrat font-normal leading-[1.6]" style={{ fontSize: "11px", color: "#706b6b" }}>
            UK advertising disclosure guidelines apply to all sponsored content.
          </p>
        </div>
        <a href={ASA_GUIDELINES_URL} target="_blank" rel="noopener noreferrer" className="font-montserrat font-semibold" style={{ fontSize: "11px", color: "#e4dcd1", textDecoration: "none", paddingLeft: "21px" }}>
          ASA Guidelines →
        </a>
      </div>

      {/* ── Sticky comment input ─────────────────────────── */}
      <div
        className="fixed z-40 flex items-center gap-3 px-5 py-3"
        style={{ bottom: "80px", background: "#1c1c1c", borderTop: "1px solid rgba(255,255,255,0.06)", width: "100%", maxWidth: "390px", left: "50%", transform: "translateX(-50%)" }}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-none" style={{ background: "#e4dcd1" }}>
          <span className="font-montserrat font-semibold" style={{ fontSize: "9px", color: "#222222" }}>HW</span>
        </div>
        <div className="flex-1 flex items-center gap-2 px-4 py-2 rounded-pill" style={{ background: "#2a2a2a" }}>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What are your thoughts?"
            className="flex-1 bg-transparent outline-none font-montserrat font-normal"
            style={{ fontSize: "12px", color: "#ffffff" }}
          />
          <Mic size={14} color="#706b6b" />
        </div>
        <style>{`input::placeholder { color: #706b6b; }`}</style>
      </div>
    </div>
  );
}
