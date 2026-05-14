"use client";

import { Search, Play, FileText, Download, Link as LinkIcon, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface ContentItem {
  id: string;
  title: string;
  contentType: string;
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
  { label: "ALL",             value: "all" },
  { label: "BLOG",            value: "blog_post" },
  { label: "WORKBOOK",        value: "workbook" },
  { label: "VIDEO",           value: "video" },
  { label: "COURSE",          value: "course" },
  { label: "INDUSTRY UPDATE", value: "industry_update" },
];

const CATEGORY_FILTERS = [
  { label: "ALL",              value: "all" },
  { label: "SOCIAL MEDIA",    value: "social_media" },
  { label: "CONTENT CREATION", value: "content_creation" },
  { label: "BRAND DEALS",     value: "brand_deals" },
  { label: "GROWTH",          value: "growth" },
  { label: "MINDSET",         value: "mindset" },
  { label: "TIPS & TRICKS",   value: "tips_and_tricks" },
];

const TYPE_PILL_STYLE: Record<string, { bg: string; text: string; border?: string; label: string }> = {
  blog_post:       { bg: "#8b6f5e", text: "#e4dcd1", label: "BLOG" },
  workbook:        { bg: "#4a5e4a", text: "#e4dcd1", label: "WORKBOOK" },
  video:           { bg: "#3d3550", text: "#e4dcd1", label: "VIDEO" },
  course:          { bg: "#222222", text: "#e4dcd1", border: "1px solid rgba(228,220,209,0.2)", label: "COURSE" },
  industry_update: { bg: "#706b6b", text: "#e4dcd1", label: "INDUSTRY UPDATE" },
};

const TYPE_BG: Record<string, string> = {
  blog_post: "#8b6f5e",
  workbook:  "#4a5e4a",
  video:     "#3d3550",
  course:    "#222222",
  industry_update: "#706b6b",
};

function getTemplatePlatform(url: string): string {
  if (url.includes("canva.com")) return "Opens in Canva";
  if (url.includes("google.com")) return "Opens in Google";
  return "Open link";
}

function ContentCard({ item }: { item: ContentItem }) {
  const isWorkbook = item.contentType === "workbook";
  const isVideo = item.contentType === "video";
  const hasThumbnail = !!item.thumbnailUrl;
  const pillStyle = TYPE_PILL_STYLE[item.contentType] ?? TYPE_PILL_STYLE.blog_post;
  const bg = TYPE_BG[item.contentType] ?? "#3a3a3a";

  // Workbook: compact card with download + template actions
  if (isWorkbook) {
    return (
      <div
        style={{
          background: "#2a2a2a",
          borderRadius: "12px",
          padding: "14px",
          border: "1px solid rgba(228,220,209,0.08)",
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: "48px", height: "48px", background: "#333333", borderRadius: "8px" }}
          >
            <FileText size={20} color="#4a5e4a" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <span
              className="font-montserrat font-semibold uppercase"
              style={{ fontSize: "9px", letterSpacing: "0.10em", background: pillStyle.bg, color: pillStyle.text, padding: "2px 8px", borderRadius: "20px", display: "inline-block" }}
            >
              {pillStyle.label}
            </span>
            <p className="font-playfair font-normal text-white truncate" style={{ fontSize: "14px", marginTop: "3px", lineHeight: 1.3 }}>
              {item.title}
            </p>
          </div>
        </div>

        {/* PDF download */}
        {item.pdfUrl && (
          <a
            href={item.pdfUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "#333333",
              borderRadius: "8px",
              padding: "12px 16px",
              marginTop: "12px",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            <Download size={16} color="#4a5e4a" />
            <div>
              <p className="font-montserrat font-semibold text-white" style={{ fontSize: "13px" }}>Download Workbook</p>
              <p className="font-montserrat" style={{ fontSize: "10px", color: "#706b6b" }}>PDF</p>
            </div>
          </a>
        )}

        {/* Editable template */}
        {item.editableTemplateUrl && (
          <button
            onClick={() => window.open(item.editableTemplateUrl!, "_blank")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "#2a2a2a",
              border: "1px solid rgba(228,220,209,0.08)",
              borderRadius: "8px",
              padding: "12px 16px",
              marginTop: "8px",
              width: "100%",
              cursor: "pointer",
            }}
          >
            <LinkIcon size={16} color="#9b7e56" />
            <div style={{ textAlign: "left" }}>
              <p className="font-montserrat font-semibold text-white" style={{ fontSize: "13px" }}>Open Editable Template</p>
              <p className="font-montserrat" style={{ fontSize: "10px", color: "#706b6b" }}>{getTemplatePlatform(item.editableTemplateUrl)}</p>
            </div>
          </button>
        )}
      </div>
    );
  }

  // Video: card with play button
  if (isVideo) {
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
        <div className="relative" style={{ height: "130px", background: hasThumbnail ? undefined : bg }}>
          {hasThumbnail && <Image src={item.thumbnailUrl!} alt={item.title} fill style={{ objectFit: "cover" }} />}
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.25)" }} />
          <div className="absolute top-3 left-3">
            <span className="font-montserrat font-semibold uppercase" style={{ fontSize: "9px", letterSpacing: "0.10em", background: pillStyle.bg, color: pillStyle.text, border: pillStyle.border, padding: "3px 10px", borderRadius: "20px" }}>
              {pillStyle.label}
            </span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(228,220,209,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Play size={16} color="#e4dcd1" fill="#e4dcd1" />
            </div>
          </div>
        </div>
        <div style={{ padding: "12px" }}>
          <p className="font-playfair font-normal text-white" style={{ fontSize: "15px", lineHeight: 1.3 }}>{item.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b" }}>Video</span>
            {item.categories.length > 0 && (
              <>
                <span style={{ fontSize: "11px", color: "#444" }}>·</span>
                <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b" }}>{item.categories[0].replace(/_/g, " ")}</span>
              </>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Blog post, course, industry update: card with thumbnail
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
      <div className="relative" style={{ height: "130px", background: hasThumbnail ? undefined : bg }}>
        {hasThumbnail && <Image src={item.thumbnailUrl!} alt={item.title} fill style={{ objectFit: "cover" }} />}
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.25)" }} />
        <div className="absolute top-3 left-3">
          <span className="font-montserrat font-semibold uppercase" style={{ fontSize: "9px", letterSpacing: "0.10em", background: pillStyle.bg, color: pillStyle.text, border: pillStyle.border, padding: "3px 10px", borderRadius: "20px" }}>
            {pillStyle.label}
          </span>
        </div>
        <div className="absolute bottom-3 right-3">
          <BookOpen size={16} color="rgba(228,220,209,0.4)" />
        </div>
      </div>
      <div style={{ padding: "12px" }}>
        <p className="font-playfair font-normal text-white" style={{ fontSize: "15px", lineHeight: 1.3 }}>{item.title}</p>
        <div className="flex items-center gap-2 mt-1">
          {item.readingTimeMinutes && (
            <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b" }}>{item.readingTimeMinutes} min read</span>
          )}
          {item.categories.length > 0 && (
            <>
              {item.readingTimeMinutes && <span style={{ fontSize: "11px", color: "#444" }}>·</span>}
              <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b" }}>{item.categories[0].replace(/_/g, " ")}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function LearnPage() {
  const [activeType, setActiveType] = useState("all");
  const [activeCategory, setActiveCategory] = useState("all");
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
    const matchType = activeType === "all" || item.contentType === activeType;
    const matchCat = activeCategory === "all" || item.categories.includes(activeCategory);
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase());
    return matchType && matchCat && matchSearch;
  });

  const pillBase = {
    fontSize: "9px" as const,
    letterSpacing: "0.10em",
    padding: "5px 14px",
    borderRadius: "20px",
  };

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
          style={{ background: "#2a2a2a", borderRadius: "8px", paddingLeft: "44px", paddingRight: "16px", fontSize: "13px", color: "#ffffff", caretColor: "#e4dcd1" }}
        />
        <style>{`input::placeholder { color: #706b6b; }`}</style>
      </div>

      {/* Type filter pills */}
      <div className="flex gap-2 overflow-x-auto" style={{ padding: "0 20px 10px", scrollbarWidth: "none" }}>
        {TYPE_FILTERS.map((f) => {
          const isActive = activeType === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setActiveType(f.value)}
              className="flex-none font-montserrat font-semibold uppercase transition-colors"
              style={{ ...pillBase, background: isActive ? "#e4dcd1" : "transparent", color: isActive ? "#222222" : "#706b6b", border: isActive ? "none" : "1px solid rgba(228,220,209,0.25)" }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto" style={{ padding: "0 20px 20px", scrollbarWidth: "none" }}>
        {CATEGORY_FILTERS.map((f) => {
          const isActive = activeCategory === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setActiveCategory(f.value)}
              className="flex-none font-montserrat font-semibold uppercase transition-colors"
              style={{ ...pillBase, background: isActive ? "#e4dcd1" : "transparent", color: isActive ? "#222222" : "#706b6b", border: isActive ? "none" : "1px solid rgba(228,220,209,0.25)" }}
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
            <p className="font-playfair italic text-white/40" style={{ fontSize: "18px" }}>Nothing here yet</p>
            <p className="font-montserrat text-white/25 mt-1" style={{ fontSize: "12px" }}>Check back soon for new resources</p>
          </div>
        ) : (
          filtered.map((item) => <ContentCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}
