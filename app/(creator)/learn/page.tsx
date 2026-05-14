"use client";

import { Search, Play, FileText, Download, ExternalLink, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface ContentItem {
  id: string;
  title: string;
  contentType: string;
  section: string;
  categories: string[];
  status: string;
  publishedAt: string | null;
  readingTimeMinutes: number | null;
  thumbnailUrl: string | null;
  pdfUrl: string | null;
  editableTemplateUrl: string | null;
  videoEmbedUrl: string | null;
  likesCount: number;
}

const TYPE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Articles", value: "article" },
  { label: "Videos", value: "video" },
  { label: "PDFs", value: "pdf" },
  { label: "Templates", value: "template" },
];

const SECTION_LABELS: Record<string, string> = {
  pitching: "Pitching & Outreach",
  content: "Content Creation",
  "brand-deals": "Brand Deals",
  growth: "Growth",
  mindset: "Mindset & Business",
};

const TYPE_COLOURS: Record<string, string> = {
  article: "#e4dcd1",
  video: "#c4b5fd",
  pdf: "#27AE60",
  template: "#9b7e56",
};

function ContentCard({ item }: { item: ContentItem }) {
  const isPdf = item.contentType === "pdf";
  const isTemplate = item.contentType === "template";
  const isVideo = item.contentType === "video";
  const isArticle = item.contentType === "article";

  const hasThumbnail = !!item.thumbnailUrl;
  const labelColour = TYPE_COLOURS[item.contentType] ?? "#e4dcd1";

  // Compact row layout for PDFs and templates (no big thumbnail)
  if (isPdf || isTemplate) {
    const href = isPdf ? item.pdfUrl : item.editableTemplateUrl;
    return (
      <a
        href={href ?? `/learn/${item.id}`}
        target={href ? "_blank" : undefined}
        rel="noreferrer"
        style={{
          background: "#2a2a2a",
          borderRadius: "12px",
          padding: "14px",
          border: "1px solid rgba(228,220,209,0.08)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          textDecoration: "none",
        }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: "48px", height: "48px", background: "#333333", borderRadius: "8px" }}
        >
          <FileText size={20} color={labelColour} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <span
            className="font-montserrat font-semibold uppercase"
            style={{ fontSize: "9px", letterSpacing: "0.10em", color: labelColour }}
          >
            {item.contentType === "pdf" ? "PDF Guide" : "Template"}
          </span>
          <p
            className="font-playfair font-normal text-white truncate"
            style={{ fontSize: "14px", marginTop: "3px", lineHeight: 1.3 }}
          >
            {item.title}
          </p>
          {item.contentType === "pdf" && (
            <div className="flex items-center gap-1 mt-1">
              <Download size={12} color={labelColour} strokeWidth={1.5} />
              <span className="font-montserrat" style={{ fontSize: "11px", color: labelColour }}>Download PDF</span>
            </div>
          )}
          {item.contentType === "template" && (
            <div className="flex items-center gap-1 mt-1">
              <ExternalLink size={12} color={labelColour} strokeWidth={1.5} />
              <span className="font-montserrat" style={{ fontSize: "11px", color: labelColour }}>Open template</span>
            </div>
          )}
        </div>
      </a>
    );
  }

  // Card with thumbnail layout for videos and articles
  return (
    <Link
      href={`/learn/${item.id}`}
      style={{
        background: "#2a2a2a",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(228,220,209,0.08)",
        display: "block",
        textDecoration: "none",
      }}
    >
      {/* Thumbnail */}
      <div
        className="relative"
        style={{
          height: "130px",
          background: hasThumbnail ? undefined : (isVideo ? "#3d3550" : "#2e3e2e"),
        }}
      >
        {hasThumbnail && (
          <Image src={item.thumbnailUrl!} alt={item.title} fill style={{ objectFit: "cover" }} />
        )}
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.25)" }} />

        {/* Section badge */}
        <div className="absolute top-3 left-3">
          <span
            className="font-montserrat font-semibold uppercase"
            style={{
              fontSize: "9px",
              letterSpacing: "0.10em",
              background: "rgba(34,34,34,0.75)",
              color: labelColour,
              padding: "3px 10px",
              borderRadius: "20px",
              backdropFilter: "blur(4px)",
            }}
          >
            {SECTION_LABELS[item.section] ?? item.section}
          </span>
        </div>

        {/* Play button for videos */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="flex items-center justify-center"
              style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(228,220,209,0.15)" }}
            >
              <Play size={16} color="#e4dcd1" fill="#e4dcd1" />
            </div>
          </div>
        )}

        {/* Article icon */}
        {isArticle && (
          <div className="absolute bottom-3 right-3">
            <BookOpen size={16} color="rgba(228,220,209,0.5)" />
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "12px" }}>
        <p className="font-playfair font-normal text-white" style={{ fontSize: "15px", lineHeight: 1.3 }}>
          {item.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {isArticle && item.readingTimeMinutes && (
            <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b" }}>
              {item.readingTimeMinutes} min read
            </span>
          )}
          {isVideo && (
            <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b" }}>
              Video
            </span>
          )}
          {item.categories.length > 0 && (
            <>
              <span style={{ fontSize: "11px", color: "#444" }}>·</span>
              <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b" }}>
                {item.categories[0]}
              </span>
            </>
          )}
        </div>
        {item.likesCount > 0 && (
          <p className="font-montserrat font-normal mt-1" style={{ fontSize: "11px", color: "#555" }}>
            {item.likesCount} saves
          </p>
        )}
      </div>
    </Link>
  );
}

export default function LearnPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content?status=published")
      .then((r) => r.json())
      .then((data) => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = items.filter((item) => {
    const matchType = activeFilter === "all" || item.contentType === activeFilter;
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "20px 20px 16px" }}>
        <h1 className="text-page-heading text-white">Learning Lounge</h1>
      </div>

      {/* Search bar */}
      <div className="relative flex items-center" style={{ margin: "0 20px 16px", height: "44px" }}>
        <Search size={16} color="#706b6b" className="absolute left-4" style={{ pointerEvents: "none" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search resources..."
          className="w-full h-full font-montserrat font-normal outline-none"
          style={{
            background: "#2a2a2a",
            borderRadius: "8px",
            paddingLeft: "44px",
            paddingRight: "16px",
            fontSize: "13px",
            color: "#ffffff",
            caretColor: "#e4dcd1",
          }}
        />
        <style>{`input::placeholder { color: #706b6b; }`}</style>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto" style={{ padding: "0 20px 20px", scrollbarWidth: "none" }}>
        {TYPE_FILTERS.map((f) => {
          const isActive = activeFilter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className="flex-none font-montserrat font-semibold uppercase transition-colors"
              style={{
                fontSize: "9px",
                letterSpacing: "0.10em",
                padding: "5px 14px",
                borderRadius: "20px",
                background: isActive ? "#e4dcd1" : "transparent",
                color: isActive ? "#222222" : "#706b6b",
                border: isActive ? "none" : "1px solid rgba(228,220,209,0.25)",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex flex-col" style={{ padding: "0 20px 32px", gap: "12px" }}>
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: "180px", background: "#2a2a2a", borderRadius: "12px", opacity: 0.5 }} />
            ))}
          </>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <p className="font-playfair italic text-white/40" style={{ fontSize: "18px" }}>
              Nothing here yet
            </p>
            <p className="font-montserrat text-white/25 mt-1" style={{ fontSize: "12px" }}>
              Check back soon for new resources
            </p>
          </div>
        ) : (
          filtered.map((item) => <ContentCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}
