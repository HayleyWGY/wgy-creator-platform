"use client";

import { Heart, MessageCircle, Bookmark, Play, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { CampaignCard } from "@/components/creator/campaign-card";
import { PillTag } from "@/components/ui/pill-tag";
import { getAge } from "@/lib/utils";
import { CONTENT_TYPE_BG, CONTENT_TYPE_LABEL } from "@/lib/constants";

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

interface LearnItem {
  id: string;
  title: string;
  contentType: string;
  thumbnailUrl: string | null;
  readingTimeMinutes: number | null;
}


export default function HomePage() {
  const { data: session } = useSession();
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [learnItems, setLearnItems] = useState<LearnItem[]>([]);

  useEffect(() => {
    fetch("/api/campaigns?limit=3")
      .then((r) => r.json())
      .then((data) => setCampaigns(data.campaigns ?? []))
      .catch(() => {});
    fetch("/api/content?status=published")
      .then((r) => r.json())
      .then((data: LearnItem[]) => setLearnItems(data.slice(0, 3)))
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
          {learnItems.map((item) => {
            const isVideo = item.contentType === "video";
            const isWorkbook = item.contentType === "workbook";
            const bg = CONTENT_TYPE_BG[item.contentType] ?? "#3a3a3a";
            const meta = isWorkbook ? "Workbook" : isVideo ? "Video" : item.readingTimeMinutes ? `${item.readingTimeMinutes} min read` : item.contentType.replace(/_/g, " ");
            return (
              <Link
                key={item.id}
                href={`/learn/${item.id}`}
                style={{
                  flex: "0 0 200px",
                  background: "#2a2a2a",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid rgba(228,220,209,0.08)",
                  textDecoration: "none",
                  display: "block",
                }}
              >
                {/* Thumbnail area */}
                <div style={{ height: "140px", background: bg, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.thumbnailUrl ? (
                    <Image src={item.thumbnailUrl} alt={item.title} fill style={{ objectFit: "cover" }} />
                  ) : isVideo ? (
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(228,220,209,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Play size={12} color="#e4dcd1" fill="#e4dcd1" />
                    </div>
                  ) : isWorkbook ? (
                    <FileText size={24} color="#e4dcd1" strokeWidth={1.5} />
                  ) : null}

                  {item.thumbnailUrl && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)" }} />}

                  {/* Type pill */}
                  <div style={{ position: "absolute", top: "8px", left: "8px" }}>
                    <span
                      className="font-montserrat font-semibold uppercase"
                      style={{ fontSize: "8px", letterSpacing: "0.08em", background: "rgba(34,34,34,0.75)", color: "#e4dcd1", padding: "2px 6px", borderRadius: "20px" }}
                    >
                      {CONTENT_TYPE_LABEL[item.contentType] ?? item.contentType.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding: "10px" }}>
                  <p className="font-playfair font-normal text-white" style={{ fontSize: "13px", lineHeight: 1.3 }}>
                    {item.title}
                  </p>
                  <p className="font-montserrat font-normal" style={{ fontSize: "10px", color: "#706b6b", marginTop: "4px" }}>
                    {meta}
                  </p>
                </div>
              </Link>
            );
          })}
          {learnItems.length === 0 && (
            <p className="font-montserrat text-white/20 pl-1" style={{ fontSize: "12px", paddingTop: "16px" }}>
              Coming soon
            </p>
          )}
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
