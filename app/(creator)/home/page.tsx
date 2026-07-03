"use client";

import { Play, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CampaignCard } from "@/components/creator/campaign-card";
import { getAge } from "@/lib/utils";
import { CONTENT_TYPE_LABEL } from "@/lib/constants";
import type { CreatorPost } from "@/components/creator/creator-post-card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SectionHeader } from "@/components/ui/section-header";
import { AsteriskDivider } from "@/components/ui/asterisk-divider";
import { OnboardingChecklist } from "@/components/creator/onboarding-checklist";
import { Heart, MessageCircle } from "lucide-react";

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
      <div className="px-5 pt-6 pb-2">
        <Eyebrow hairline style={{ marginBottom: 12 }}>The WGY edit</Eyebrow>
        <h1 className="text-display">
          Hey,<br /><em className="font-accent" style={{ fontSize: "1.04em" }}>{session?.user?.firstName || "there"}.</em>
        </h1>
        <p className="font-montserrat" style={{ fontSize: "13.5px", fontWeight: 500, color: "var(--text-muted)", marginTop: 14, maxWidth: "30ch", lineHeight: 1.5 }}>
          Your latest opportunities and community updates.
        </p>
      </div>

      {/* New-member checklist — auto-hides once complete */}
      <OnboardingChecklist />

      {/* New Opportunities */}
      <div className="mt-7 mb-3">
        <div className="px-5">
          <Eyebrow style={{ marginBottom: 10 }}>Opportunities</Eyebrow>
        </div>
        <div className="px-5 mb-3">
          <SectionHeader lead="This week's" accent="drops" seeAllHref="/opportunities" />
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
                <div key={i} className="flex-none w-[200px]" style={{ height: "200px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", opacity: 0.5 }} />
              ))}
        </div>
      </div>

      {/* Creator Corner */}
      <div className="mt-7">
        <div className="px-5">
          <Eyebrow style={{ marginBottom: 10 }}>Creator Corner</Eyebrow>
        </div>
        <div className="px-5 mb-3">
          <SectionHeader lead="From the" accent="community" seeAllHref="/community/creator-corner" />
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
                    width: 256,
                    minHeight: 172,
                    display: "flex",
                    flexDirection: "column",
                    background: "var(--surface)",
                    borderRadius: "var(--radius-card)",
                    padding: "18px 18px 16px",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                  }}
                >
                  {/* Author row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 11 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                      {post.author.profileImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.author.profileImageUrl} alt={initials} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span className="font-montserrat" style={{ fontSize: 11, fontWeight: 800, color: "var(--text)" }}>{initials}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="font-montserrat" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {post.author.firstName} {post.author.lastName}
                      </span>
                      <span className="font-montserrat" style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>{getAge(post.createdAt)}</span>
                    </div>
                  </div>

                  {/* Body — 3 line clamp, TEXT ONLY (no images on home preview) */}
                  <p className="font-montserrat" style={{
                    fontSize: 13, fontWeight: 500, color: "var(--text-muted)", lineHeight: 1.5, margin: 0, flex: 1,
                    display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {post.body}
                  </p>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 16, marginTop: 13 }}>
                    <span className="font-montserrat" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}><Heart size={14} strokeWidth={1.8} />{post.likesCount}</span>
                    <span className="font-montserrat" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}><MessageCircle size={14} strokeWidth={1.8} />{post.commentsCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mx-5" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: 14 }}>
            <p className="font-montserrat text-center" style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>
              No posts yet — be the first to share something!
            </p>
          </div>
        )}
      </div>

      {/* Asterisk divider */}
      <AsteriskDivider className="mx-5 mt-8 mb-2" />

      {/* Learning Lounge */}
      <div className="mt-6 mb-6">
        <div className="px-5">
          <Eyebrow style={{ marginBottom: 10 }}>Learning Lounge</Eyebrow>
        </div>
        <div className="px-5 mb-3">
          <SectionHeader lead="Level" accent="up" seeAllHref="/learn" />
        </div>

        <div className="flex gap-3 overflow-x-auto pl-5 pr-8 pb-1" style={{ scrollbarWidth: "none" }}>
          {learnItems.map(item => {
            const isVideo    = item.contentType === "video";
            const isWorkbook = item.contentType === "workbook";
            const meta       = isWorkbook ? "Download" : isVideo ? "Video" : item.readingTimeMinutes ? `${item.readingTimeMinutes} min read` : item.contentType.replace(/_/g, " ");
            return (
              <Link
                key={item.id}
                href={`/learn/${item.id}`}
                style={{ flex: "0 0 200px", background: "var(--surface)", borderRadius: "var(--radius-card)", overflow: "hidden", border: "1px solid var(--border)", textDecoration: "none", display: "block" }}
              >
                <div style={{ height: "112px", background: "linear-gradient(140deg, var(--img-b), var(--img-a))", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.thumbnailUrl ? (
                    <Image src={item.thumbnailUrl} alt={item.title} fill style={{ objectFit: "cover" }} />
                  ) : isVideo ? (
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(228,220,209,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Play size={12} style={{ color: "var(--accent)" }} fill="currentColor" />
                    </div>
                  ) : isWorkbook ? (
                    <FileText size={24} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                  ) : null}
                  {item.thumbnailUrl && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)" }} />}
                  <div style={{ position: "absolute", bottom: "12px", left: "12px" }}>
                    <span className="font-montserrat uppercase" style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.12em", background: "rgba(17,17,17,0.72)", color: "#e4dcd1", padding: "5px 9px", borderRadius: "var(--radius-pill)", border: "1px solid rgba(228,220,209,0.2)" }}>
                      {CONTENT_TYPE_LABEL[item.contentType] ?? item.contentType.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
                <div style={{ padding: "13px 15px 16px" }}>
                  <h3 className="font-montserrat" style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--text)", lineHeight: 1.25, margin: 0 }}>{item.title}</h3>
                  <p className="font-montserrat uppercase" style={{ fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.04em", color: "var(--text-muted)", marginTop: "8px" }}>{meta}</p>
                </div>
              </Link>
            );
          })}
          {learnItems.length === 0 && (
            <p className="font-montserrat pl-1" style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-muted)", paddingTop: "16px" }}>Coming soon</p>
          )}
        </div>
      </div>
    </div>
  );
}
