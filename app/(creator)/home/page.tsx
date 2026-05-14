"use client";

import { Heart, MessageCircle, Bookmark, Play, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { CampaignCard } from "@/components/creator/campaign-card";
import { PillTag } from "@/components/ui/pill-tag";

interface Campaign {
  id: string;
  slug: string;
  brandName: string;
  campaignType: string;
  title: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  coverImageUrl: string | null;
  eventDate: string | null;
}

function getAge(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "Just now";
}

const LEARNING = [
  { type: "VIDEO",   bg: "#3d3550", title: "Mastering Brand Negotiations", meta: "45 min"      },
  { type: "PDF",     bg: "#4a5e4a", title: "2026 Creator Checklist",       meta: "Download"    },
  { type: "ARTICLE", bg: "#8b6f5e", title: "10 Ways to Increase Engagement", meta: "5 min read" },
];

export default function HomePage() {
  const { data: session } = useSession();
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    fetch("/api/campaigns?limit=3")
      .then((r) => r.json())
      .then((data) => setCampaigns(data.campaigns ?? []))
      .catch(() => {});
  }, []);

  return (
    <div>
      {/* Greeting */}
      <div className="px-5 pt-5 pb-4">
        <h1 className="text-display text-white leading-tight">Hey, {session?.user?.firstName || "there"}</h1>
        <p className="font-montserrat font-normal mt-1" style={{ fontSize: "12px", color: "#706b6b" }}>
          Your latest opportunities and community updates
        </p>
      </div>

      {/* New Opportunities */}
      <div className="mb-3">
        <div className="px-5 mb-3 flex items-center justify-between">
          <span className="text-section-label">New Opportunities</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pl-5 pr-8 pb-1" style={{ scrollbarWidth: "none" }}>
          {campaigns.length > 0
            ? campaigns.map((opp) => (
                <Link key={opp.id} href={`/opportunities/${opp.slug}`} className="flex-none w-[200px]" style={{ textDecoration: "none" }}>
                  <CampaignCard
                    brandName={opp.brandName}
                    coverImageUrl={opp.coverImageUrl ?? undefined}
                    campaignType={opp.campaignType}
                    title={opp.title}
                    likesCount={opp.likesCount}
                    commentsCount={opp.commentsCount}
                    timestamp={getAge(opp.createdAt)}
                    eventDate={opp.eventDate}
                    compactBadge
                  />
                </Link>
              ))
            : // Skeleton placeholders while loading
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-none w-[200px] rounded-card"
                  style={{ height: "200px", background: "#2a2a2a", opacity: 0.5 }}
                />
              ))}
        </div>
        <div className="px-5 mt-2 flex justify-end">
          <Link href="/opportunities" className="font-montserrat font-semibold" style={{ fontSize: "11px", color: "#e4dcd1", textDecoration: "none" }}>
            View all →
          </Link>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 my-4" style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

      {/* Latest from Community */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-section-label">Latest from Community</span>
        </div>

        <div className="rounded-card p-[14px]" style={{ background: "#2a2a2a", border: "1px solid rgba(228,220,209,0.08)" }}>
          {/* Post header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center flex-none" style={{ background: "#e4dcd1" }}>
              <span className="font-montserrat font-semibold" style={{ fontSize: "11px", color: "#222222" }}>SC</span>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-montserrat font-semibold text-white" style={{ fontSize: "12px" }}>Sophie Chen</span>
              <PillTag label="Creator" />
            </div>
            <span className="font-montserrat flex-none" style={{ fontSize: "10px", color: "#706b6b" }}>3h ago</span>
          </div>

          {/* Post body */}
          <p className="font-montserrat font-normal mb-3 leading-[1.6]" style={{ fontSize: "12px", color: "#c8c3bc" }}>
            Just got confirmed for the Boots UK campaign! So excited 🎉 Anyone else applying for the Nature Spell one?
          </p>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button onClick={() => setLiked(!liked)} className="flex items-center gap-1.5">
              <Heart size={14} fill={liked ? "#e4dcd1" : "none"} color={liked ? "#e4dcd1" : "#706b6b"} />
              <span className="font-montserrat" style={{ fontSize: "10px", color: "#706b6b" }}>14</span>
            </button>
            <button className="flex items-center gap-1.5">
              <MessageCircle size={14} color="#706b6b" />
              <span className="font-montserrat" style={{ fontSize: "10px", color: "#706b6b" }}>5</span>
            </button>
            <button onClick={() => setBookmarked(!bookmarked)} className="ml-auto">
              <Bookmark size={14} fill={bookmarked ? "#e4dcd1" : "none"} color={bookmarked ? "#e4dcd1" : "#706b6b"} />
            </button>
          </div>
        </div>

        <div className="mt-2 flex justify-end">
          <Link href="/community" className="font-montserrat font-semibold" style={{ fontSize: "11px", color: "#e4dcd1", textDecoration: "none" }}>
            View all →
          </Link>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 my-4" style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

      {/* Learning Lounge */}
      <div className="mb-6">
        <div className="px-5 mb-3">
          <span
            className="font-montserrat font-bold uppercase"
            style={{ fontSize: "10px", letterSpacing: "0.14em", color: "#e4dcd1" }}
          >
            From the Learning Lounge
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto pl-5 pr-8 pb-1" style={{ scrollbarWidth: "none" }}>
          {LEARNING.map((item, i) => (
            <div
              key={i}
              style={{
                flex: "0 0 200px",
                background: "#2a2a2a",
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid rgba(228,220,209,0.08)",
              }}
            >
              {/* Thumbnail area */}
              <div style={{ height: "140px", background: item.bg, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {item.type === "VIDEO" && (
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(228,220,209,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Play size={12} color="#e4dcd1" fill="#e4dcd1" />
                  </div>
                )}
                {item.type === "PDF" && (
                  <FileText size={24} color="#e4dcd1" strokeWidth={1.5} />
                )}

                {/* Type pill */}
                <div style={{ position: "absolute", top: "8px", left: "8px" }}>
                  <span
                    className="font-montserrat font-semibold uppercase"
                    style={{ fontSize: "8px", letterSpacing: "0.08em", background: "#706b6b", color: "#e4dcd1", padding: "2px 6px", borderRadius: "20px" }}
                  >
                    {item.type}
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: "10px" }}>
                <p className="font-playfair font-normal text-white" style={{ fontSize: "13px", lineHeight: 1.3 }}>
                  {item.title}
                </p>
                <p className="font-montserrat font-normal" style={{ fontSize: "10px", color: "#706b6b", marginTop: "4px" }}>
                  {item.meta}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 mt-2 flex justify-end">
          <Link href="/learn" className="font-montserrat font-semibold" style={{ fontSize: "11px", color: "#e4dcd1", textDecoration: "none" }}>
            View all →
          </Link>
        </div>
      </div>
    </div>
  );
}
