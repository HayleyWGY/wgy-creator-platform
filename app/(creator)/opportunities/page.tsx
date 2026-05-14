"use client";

import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { CampaignCard } from "@/components/creator/campaign-card";
import { OPPORTUNITY_FILTERS } from "@/lib/constants";
import { getAge } from "@/lib/utils";

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
}


export default function OpportunitiesPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const url =
      activeFilter === "All"
        ? "/api/campaigns"
        : `/api/campaigns?filter=${encodeURIComponent(activeFilter)}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => setCampaigns(data.campaigns ?? []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, [activeFilter]);

  const filtered = search.trim()
    ? campaigns.filter(
        (c) =>
          c.brandName.toLowerCase().includes(search.toLowerCase()) ||
          c.title.toLowerCase().includes(search.toLowerCase())
      )
    : campaigns;

  return (
    <div>
      {/* Page header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-page-heading text-white">Opportunities</h1>
      </div>

      {/* Search bar */}
      <div className="mx-5 mb-4 relative">
        <Search size={15} color="#706b6b" className="absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search campaigns..."
          className="w-full font-montserrat font-normal outline-none pl-9 pr-4 py-2.5 rounded-button"
          style={{ background: "#2a2a2a", color: "#ffffff", fontSize: "13px", caretColor: "#e4dcd1" }}
        />
        <style>{`input::placeholder { color: #706b6b; }`}</style>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto px-5 pb-5" style={{ scrollbarWidth: "none" }}>
        {OPPORTUNITY_FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className="flex-none font-montserrat font-semibold uppercase rounded-pill px-4 py-[6px] transition-colors"
              style={{
                fontSize: "9px",
                letterSpacing: "0.10em",
                background: isActive ? "#e4dcd1" : "transparent",
                color: isActive ? "#222222" : "#706b6b",
                border: isActive ? "none" : "1px solid rgba(228,220,209,0.3)",
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
              className="rounded-card overflow-hidden"
              style={{ background: "#2a2a2a", height: "220px", opacity: 0.5 }}
            />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "#706b6b" }}>
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
              />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
