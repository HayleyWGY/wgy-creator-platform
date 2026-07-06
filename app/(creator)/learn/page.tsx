"use client";

import { Search, Play, BookOpen } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CONTENT_TYPE_LABEL } from "@/lib/constants";
import { Eyebrow } from "@/components/ui/eyebrow";

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

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  borderRadius: "var(--radius-card)",
  overflow: "hidden",
  border: "1px solid var(--border)",
  display: "block",
  textDecoration: "none",
};

const mediaPlaceholder = "linear-gradient(140deg, var(--img-b), var(--img-a))";

function KindPill({ label }: { label: string }) {
  return (
    <span
      className="font-montserrat uppercase"
      style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.12em", background: "rgba(17,17,17,0.72)", color: "#e4dcd1", padding: "5px 10px", borderRadius: "var(--radius-pill)", border: "1px solid rgba(228,220,209,0.2)" }}
    >
      {label}
    </span>
  );
}

function ContentCard({ item }: { item: ContentItem }) {
  const router = useRouter();
  const isWorkbook = item.contentType === "workbook";
  const isVideo = item.contentType === "video";
  const hasThumbnail = !!item.thumbnailUrl;
  const label = CONTENT_TYPE_LABEL[item.contentType] ?? item.contentType.replace(/_/g, " ");

  // Workbook: thumbnail image if available, then PDF icon fallback — fully clickable
  if (isWorkbook) {
    return (
      <div
        onClick={() => router.push(`/learn/${item.id}`)}
        className="cursor-pointer"
        style={cardStyle}
      >
        {/* Thumbnail area */}
        <div className="relative" style={{ height: "180px", background: hasThumbnail ? undefined : mediaPlaceholder }}>
          {hasThumbnail ? (
            <Image src={item.thumbnailUrl!} alt={item.title} fill style={{ objectFit: "cover" }} />
          ) : null}
          {hasThumbnail && <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.2)" }} />}
          <div className="absolute top-3 left-3"><KindPill label={label} /></div>
        </div>
        <div style={{ padding: "13px 15px 16px" }}>
          <h3 className="font-montserrat" style={{ fontSize: "15px", fontWeight: 800, lineHeight: 1.25, color: "var(--text)", margin: 0 }}>{item.title}</h3>
          <p className="font-montserrat uppercase mt-1" style={{ fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.04em", color: "var(--text-muted)" }}>Download</p>
        </div>
      </div>
    );
  }

  // Video: card with play button
  if (isVideo) {
    return (
      <Link href={`/learn/${item.id}`} style={cardStyle}>
        <div className="relative" style={{ height: "130px", background: hasThumbnail ? undefined : mediaPlaceholder }}>
          {hasThumbnail && <Image src={item.thumbnailUrl!} alt={item.title} fill style={{ objectFit: "cover" }} />}
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.25)" }} />
          <div className="absolute top-3 left-3"><KindPill label={label} /></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(228,220,209,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Play size={16} style={{ color: "var(--accent)" }} fill="currentColor" />
            </div>
          </div>
        </div>
        <div style={{ padding: "13px 15px 16px" }}>
          <h3 className="font-montserrat" style={{ fontSize: "15px", fontWeight: 800, lineHeight: 1.25, color: "var(--text)", margin: 0 }}>{item.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-montserrat" style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)" }}>Video</span>
            {item.categories.length > 0 && (
              <>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>·</span>
                <span className="font-montserrat" style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)" }}>{item.categories[0].replace(/_/g, " ")}</span>
              </>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Blog post, course, industry update: card with thumbnail
  return (
    <Link href={`/learn/${item.id}`} style={cardStyle}>
      <div className="relative" style={{ height: "130px", background: hasThumbnail ? undefined : mediaPlaceholder }}>
        {hasThumbnail && <Image src={item.thumbnailUrl!} alt={item.title} fill style={{ objectFit: "cover" }} />}
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.25)" }} />
        <div className="absolute top-3 left-3"><KindPill label={label} /></div>
        <div className="absolute bottom-3 right-3">
          <BookOpen size={16} style={{ color: "rgba(228,220,209,0.4)" }} />
        </div>
      </div>
      <div style={{ padding: "13px 15px 16px" }}>
        <h3 className="font-montserrat" style={{ fontSize: "15px", fontWeight: 800, lineHeight: 1.25, color: "var(--text)", margin: 0 }}>{item.title}</h3>
        <div className="flex items-center gap-2 mt-1">
          {item.readingTimeMinutes && (
            <span className="font-montserrat" style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)" }}>{item.readingTimeMinutes} min read</span>
          )}
          {item.categories.length > 0 && (
            <>
              {item.readingTimeMinutes && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>·</span>}
              <span className="font-montserrat" style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)" }}>{item.categories[0].replace(/_/g, " ")}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function LearnPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeType, setActiveType] = useState("all");
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content?status=published&section=general")
      .then((r) => r.json())
      .then((data) => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) setActiveCategory(categoryParam);
  }, [searchParams]);

  // Suppress unused warning — router used in ContentCard via prop drilling is not needed here
  void router;

  const filtered = items.filter((item) => {
    const matchType = activeType === "all" || item.contentType === activeType;
    const matchCat = activeCategory === "all" || item.categories.includes(activeCategory);
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase());
    return matchType && matchCat && matchSearch;
  });

  const pillBase = {
    fontSize: "10px" as const,
    fontWeight: 700 as const,
    letterSpacing: "0.12em",
    padding: "5px 14px",
    borderRadius: "var(--radius-pill)",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "24px 20px 16px" }}>
        <Eyebrow style={{ marginBottom: 8 }}>Learning Lounge</Eyebrow>
        <h2 className="text-heading-large" style={{ margin: 0 }}>Level <em className="font-accent">up</em></h2>
      </div>

      {/* Search bar */}
      <div className="relative flex items-center" style={{ margin: "0 20px 16px", height: "44px" }}>
        <Search size={16} className="absolute left-4" style={{ pointerEvents: "none", color: "var(--text-muted)" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search resources..."
          className="w-full h-full font-montserrat outline-none"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-pill)", paddingLeft: "44px", paddingRight: "16px", fontSize: "13px", fontWeight: 500, color: "var(--text)", caretColor: "var(--accent)" }}
        />
        <style>{`input::placeholder { color: var(--text-muted); }`}</style>
      </div>

      {/* Type filter pills */}
      <div className="flex gap-2 overflow-x-auto" style={{ padding: "0 20px 20px", scrollbarWidth: "none" }}>
        {TYPE_FILTERS.map((f) => {
          const isActive = activeType === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setActiveType(f.value)}
              className="flex-none font-montserrat uppercase transition-colors"
              style={{ ...pillBase, background: isActive ? "var(--pill-bg)" : "transparent", color: isActive ? "var(--pill-text)" : "var(--text-muted)", border: isActive ? "1px solid var(--pill-bg)" : "1px solid var(--border-strong)" }}
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
              <div key={i} style={{ height: "180px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", opacity: 0.5 }} />
            ))}
          </>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <p className="font-montserrat" style={{ fontSize: "18px", fontWeight: 800, color: "var(--text)" }}>Nothing here yet</p>
            <p className="font-montserrat mt-1" style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>Check back soon for new resources</p>
          </div>
        ) : (
          filtered.map((item) => <ContentCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense>
      <LearnPageInner />
    </Suspense>
  );
}
