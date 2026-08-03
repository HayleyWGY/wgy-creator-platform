"use client";

import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { CampaignCard } from "@/components/creator/campaign-card";
import { OPPORTUNITY_FILTERS } from "@/lib/constants";
import { getAge } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/eyebrow";

interface Campaign {
  id: string;
  slug: string;
  brandName: string;
  campaignType: string;
  title: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  sectionSlug: string;
  coverImageUrl: string | null;
  eventDate: string | null;
  status: string;
}


export default function OpportunitiesPage() {
  const PAGE_SIZE = 50;
  const [activeFilter, setActiveFilter] = useState("All");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce typing so we hit the server once the member pauses, not per key.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const buildUrl = (offset: number) => {
    let url = `/api/campaigns?limit=${PAGE_SIZE}&offset=${offset}`;
    if (activeFilter !== "All") url += `&filter=${encodeURIComponent(activeFilter)}`;
    // Search runs on the SERVER, so it covers the whole library, not just the
    // campaigns already loaded on screen.
    if (debouncedSearch) url += `&q=${encodeURIComponent(debouncedSearch)}`;
    return url;
  };

  // Reset and load the first page whenever the filter or search term changes.
  useEffect(() => {
    setLoading(true);
    fetch(buildUrl(0))
      .then((r) => r.json())
      .then((data) => {
        setCampaigns(data.campaigns ?? []);
        setHasMore(!!data.hasMore);
      })
      .catch(() => {
        setCampaigns([]);
        setHasMore(false);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, debouncedSearch]);

  const loadMore = () => {
    setLoadingMore(true);
    fetch(buildUrl(campaigns.length))
      .then((r) => r.json())
      .then((data) => {
        setCampaigns((prev) => [...prev, ...(data.campaigns ?? [])]);
        setHasMore(!!data.hasMore);
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false));
  };

  // Text search is done on the server now, so the list is already the matches.
  const filtered = campaigns;

  return (
    <div>
      {/* Page header */}
      <div className="px-5 pt-6 pb-4">
        <Eyebrow style={{ marginBottom: 8 }}>Opportunities</Eyebrow>
        <h2 className="text-heading-large" style={{ margin: 0 }}>This week&apos;s <em className="font-accent">drops</em></h2>
      </div>

      {/* Search bar */}
      <div className="mx-5 mb-4 relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search campaigns..."
          className="w-full font-montserrat outline-none pl-9 pr-4 py-2.5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-pill)", color: "var(--text)", fontSize: "13px", fontWeight: 500, caretColor: "var(--accent)" }}
        />
        <style>{`input::placeholder { color: var(--text-muted); }`}</style>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto px-5 pb-5" style={{ scrollbarWidth: "none" }}>
        {OPPORTUNITY_FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className="flex-none font-montserrat uppercase px-4 py-[6px] transition-colors"
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                borderRadius: "var(--radius-pill)",
                background: isActive ? "var(--pill-bg)" : "transparent",
                color: isActive ? "var(--pill-text)" : "var(--text-muted)",
                border: isActive ? "1px solid var(--pill-bg)" : "1px solid var(--border-strong)",
              }}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Campaign list */}
      <div className="flex flex-col gap-3 px-5 pb-8">
        {loading ? (
          // Skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", height: "220px", opacity: 0.5 }}
            />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-montserrat" style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}>
              No campaigns found.
            </p>
          </div>
        ) : (
          filtered.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/opportunities/${campaign.slug}`}
              style={{ textDecoration: "none" }}
            >
              <CampaignCard
                brandName={campaign.brandName}
                coverImageUrl={campaign.coverImageUrl ?? undefined}
                campaignType={campaign.campaignType}
                title={campaign.title}
                likesCount={campaign.likesCount}
                commentsCount={campaign.commentsCount}
                timestamp={getAge(campaign.createdAt)}
                eventDate={campaign.eventDate}
                closed={campaign.status === "closed"}
              />
            </Link>
          ))
        )}

        {/* Load more — works for browse AND search, since both are paged on
            the server now. */}
        {!loading && hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="font-montserrat uppercase self-center mt-2"
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              padding: "10px 24px",
              borderRadius: "var(--radius-pill)",
              background: "transparent",
              color: "var(--text-muted)",
              border: "1px solid var(--border-strong)",
              cursor: loadingMore ? "wait" : "pointer",
            }}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
