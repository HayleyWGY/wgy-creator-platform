"use client";

import { Play, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CampaignCard } from "@/components/creator/campaign-card";
import { getAge } from "@/lib/utils";
import { CONTENT_TYPE_BG, CONTENT_TYPE_LABEL } from "@/lib/constants";
import type { CreatorPost } from "@/components/creator/creator-post-card";

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
  const router = useRouter();
  const [campaigns, setCampaigns]       = useState<Campaign[]>([]);
  const [learnItems, setLearnItems]     = useState<LearnItem[]>([]);
  const [creatorPosts, setCreatorPosts] = useState<CreatorPost[]>([]);

  useEffect(() => {
    fetch("/api/campaigns?limit=3")
      .then(r => r.json())
      .then(data => setCampaigns(data.campaigns ?? []))
      .catch(() => {});

    fetch("/api/content?status=published")
      .then(r => r.json())
      .then((data: LearnItem[]) => setLearnItems(data.slice(0, 3)))
      .catch(() => {});

    fetch("/api/creator-posts?limit=3")
      .then(r => r.json())
      .then(data => setCreatorPosts(data.posts || []))
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
            ? campaigns.map(opp => (
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
            : Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex-none w-[200px] rounded-card" style={{ height: "200px", background: "#2a2a2a", opacity: 0.5 }} />
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

      {/* Creator Corner */}
      <div>
        <div className="px-5 mb-3 flex items-center justify-between">
          <span className="text-section-label">Creator Corner</span>
          <Link href="/community/creator-corner" className="font-montserrat font-semibold" style={{ fontSize: "11px", color: "#e4dcd1", textDecoration: "none" }}>
            View all →
          </Link>
        </div>

        {creatorPosts.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 12,
              overflowX: "auto",
              padding: "0 20px 12px",
              msOverflowStyle: "none",
              scrollbarWidth: "none",
            }}
          >
            {creatorPosts.slice(0, 5).map(post => {
              const initials = `${post.author.firstName[0]}${post.author.lastName[0]}`;
              return (
                <div
                  key={post.id}
                  onClick={() => router.push(`/community/creator-corner/${post.id}`)}
                  style={{
                    flexShrink: 0,
                    width: 260,
                    background: "#2a2a2a",
                    borderRadius: 12,
                    padding: 14,
                    border: "1px solid rgba(255,255,255,0.06)",
                    cursor: "pointer",
                  }}
                >
                  {/* Author row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#e4dcd1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                      {post.author.profileImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.author.profileImageUrl} alt={initials} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span className="font-montserrat" style={{ fontSize: 10, fontWeight: 700, color: "#222222" }}>{initials}</span>
                      )}
                    </div>
                    <span className="font-montserrat" style={{ fontSize: 12, fontWeight: 600, color: "white", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {post.author.firstName} {post.author.lastName}
                    </span>
                    <span className="font-montserrat" style={{ fontSize: 10, color: "#706b6b", flexShrink: 0 }}>{getAge(post.createdAt)}</span>
                  </div>

                  {/* Body — 3 line clamp, no images */}
                  <p className="font-montserrat" style={{
                    fontSize: 12, color: "#c8c3bc", lineHeight: 1.5, marginTop: 8,
                    display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {post.body}
                  </p>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 12, marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="font-montserrat" style={{ fontSize: 11, color: "#706b6b" }}>♥ {post.likesCount}</span>
                    <span className="font-montserrat" style={{ fontSize: 11, color: "#706b6b" }}>💬 {post.commentsCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mx-5 rounded-xl p-[14px]" style={{ background: "#2a2a2a", border: "1px solid rgba(228,220,209,0.08)" }}>
            <p className="font-montserrat text-center" style={{ fontSize: "12px", color: "#706b6b" }}>
              No posts yet — be the first to share something!
            </p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-5 my-4" style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

      {/* Learning Lounge */}
      <div className="mb-6">
        <div className="px-5 mb-3">
          <span className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.14em", color: "#e4dcd1" }}>
            From the Learning Lounge
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto pl-5 pr-8 pb-1" style={{ scrollbarWidth: "none" }}>
          {learnItems.map(item => {
            const isVideo    = item.contentType === "video";
            const isWorkbook = item.contentType === "workbook";
            const bg         = CONTENT_TYPE_BG[item.contentType] ?? "#3a3a3a";
            const meta       = isWorkbook ? "Workbook" : isVideo ? "Video" : item.readingTimeMinutes ? `${item.readingTimeMinutes} min read` : item.contentType.replace(/_/g, " ");
            return (
              <Link
                key={item.id}
                href={`/learn/${item.id}`}
                style={{ flex: "0 0 200px", background: "#2a2a2a", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(228,220,209,0.08)", textDecoration: "none", display: "block" }}
              >
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
                  <div style={{ position: "absolute", top: "8px", left: "8px" }}>
                    <span className="font-montserrat font-semibold uppercase" style={{ fontSize: "8px", letterSpacing: "0.08em", background: "rgba(34,34,34,0.75)", color: "#e4dcd1", padding: "2px 6px", borderRadius: "20px" }}>
                      {CONTENT_TYPE_LABEL[item.contentType] ?? item.contentType.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
                <div style={{ padding: "10px" }}>
                  <p className="font-playfair font-normal text-white" style={{ fontSize: "13px", lineHeight: 1.3 }}>{item.title}</p>
                  <p className="font-montserrat font-normal" style={{ fontSize: "10px", color: "#706b6b", marginTop: "4px" }}>{meta}</p>
                </div>
              </Link>
            );
          })}
          {learnItems.length === 0 && (
            <p className="font-montserrat text-white/20 pl-1" style={{ fontSize: "12px", paddingTop: "16px" }}>Coming soon</p>
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
