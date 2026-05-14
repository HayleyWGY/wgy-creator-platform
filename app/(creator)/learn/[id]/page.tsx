"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Download, ExternalLink, ChevronRight } from "lucide-react";

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  if (url.includes("/embed/")) return url;
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

function getTemplatePlatform(url: string): string {
  if (url.includes("canva.com")) return "Opens in Canva";
  if (url.includes("google.com")) return "Opens in Google";
  return "Opens in new tab";
}

interface ContentItem {
  id: string;
  title: string;
  contentType: string;
  categories: string[];
  status: string;
  publishedAt: string | null;
  readingTimeMinutes: number | null;
  thumbnailUrl: string | null;
  bannerImageUrl: string | null;
  body: string | null;
  pdfUrl: string | null;
  editableTemplateUrl: string | null;
  videoEmbedUrl: string | null;
  videoTranscript: string | null;
}

const TYPE_PILL_STYLE: Record<string, { bg: string; text: string; border?: string; label: string }> = {
  blog_post:       { bg: "#8b6f5e", text: "#e4dcd1", label: "BLOG" },
  workbook:        { bg: "#4a5e4a", text: "#e4dcd1", label: "WORKBOOK" },
  video:           { bg: "#3d3550", text: "#e4dcd1", label: "VIDEO" },
  course:          { bg: "#222222", text: "#e4dcd1", border: "1px solid rgba(228,220,209,0.2)", label: "COURSE" },
  industry_update: { bg: "#706b6b", text: "#e4dcd1", label: "INDUSTRY UPDATE" },
};

const TYPE_BG: Record<string, string> = {
  blog_post:       "#8b6f5e",
  workbook:        "#4a5e4a",
  video:           "#3d3550",
  course:          "#222222",
  industry_update: "#706b6b",
};

export default function LearnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/content/${id}`)
      .then(async (res) => {
        if (!res.ok) { setNotFound(true); setLoading(false); return; }
        const data = await res.json();
        setItem(data);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <div style={{ height: "220px", background: "#2a2a2a", borderRadius: "12px", marginBottom: "16px" }} />
        <div style={{ height: "24px", background: "#2a2a2a", borderRadius: "6px", marginBottom: "8px", width: "70%" }} />
        <div style={{ height: "16px", background: "#2a2a2a", borderRadius: "6px", width: "40%" }} />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <p className="font-playfair italic text-white/40" style={{ fontSize: "20px" }}>Content not found</p>
        <button onClick={() => router.back()} className="font-montserrat text-[#e4dcd1] mt-4" style={{ fontSize: "13px" }}>
          Go back
        </button>
      </div>
    );
  }

  const pillStyle = TYPE_PILL_STYLE[item.contentType] ?? TYPE_PILL_STYLE.blog_post;
  const heroBg = TYPE_BG[item.contentType] ?? "#3a3a3a";
  const bannerSrc = item.bannerImageUrl || item.thumbnailUrl;
  const isWorkbook = item.contentType === "workbook";
  const isVideo = item.contentType === "video";

  function triggerPdfDownload() {
    if (!item?.pdfUrl) return;
    const filename = encodeURIComponent(item.title + ".pdf");
    const proxyUrl = `/api/download?url=${encodeURIComponent(item.pdfUrl)}&filename=${filename}`;
    const link = document.createElement("a");
    link.href = proxyUrl;
    link.download = item.title + ".pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const publishedDate = item.publishedAt
    ? new Date(item.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div style={{ paddingBottom: "40px" }}>
      {/* Back button */}
      <div style={{ padding: "16px 20px 0" }}>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="font-montserrat" style={{ fontSize: "12px" }}>Back</span>
        </button>
      </div>

      {/* ── VIDEO ── */}
      {isVideo && (
        <>
          {/* Video embed at top — no banner */}
          {item.videoEmbedUrl && getEmbedUrl(item.videoEmbedUrl) && (
            <div style={{ margin: "14px 0 0", position: "relative", background: "#000000", overflow: "hidden", aspectRatio: "16/9" }}>
              <iframe
                src={getEmbedUrl(item.videoEmbedUrl)!}
                width="100%"
                height="100%"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                style={{ display: "block", border: "none" }}
              />
            </div>
          )}

          {/* Type pill + categories */}
          <div style={{ padding: "16px 20px 0", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
            <span className="font-montserrat font-semibold uppercase" style={{ fontSize: "9px", letterSpacing: "0.10em", background: pillStyle.bg, color: pillStyle.text, border: pillStyle.border, padding: "3px 10px", borderRadius: "20px" }}>
              {pillStyle.label}
            </span>
            {item.categories.map((cat) => (
              <button
                key={cat}
                onClick={() => router.push(`/learn?category=${cat}`)}
                className="font-montserrat font-semibold uppercase"
                style={{ fontSize: "9px", letterSpacing: "0.08em", background: "#333333", color: "#706b6b", padding: "3px 8px", borderRadius: "20px", cursor: "pointer", border: "none" }}
              >
                {cat.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {/* Title */}
          <h1 className="font-playfair italic font-normal text-white" style={{ fontSize: "22px", lineHeight: 1.25, padding: "16px 20px 4px" }}>
            {item.title}
          </h1>

          {/* Meta row */}
          <div style={{ padding: "0 20px 12px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
            {publishedDate && <span className="font-montserrat" style={{ fontSize: "11px", color: "#706b6b" }}>{publishedDate}</span>}
            {item.readingTimeMinutes && <span className="font-montserrat" style={{ fontSize: "11px", color: "#706b6b" }}>{item.readingTimeMinutes} min read</span>}
          </div>

          {/* Body */}
          {item.body && (
            <div style={{ padding: "0 20px 16px" }}>
              <div className="rich-content" dangerouslySetInnerHTML={{ __html: item.body }} />
            </div>
          )}

          {/* Transcript */}
          {item.videoTranscript && (
            <div style={{ padding: "0 20px 16px" }}>
              <p className="font-montserrat font-bold uppercase text-white/30 mb-3" style={{ fontSize: "9px", letterSpacing: "0.12em" }}>Notes</p>
              <div style={{ background: "#2a2a2a", borderRadius: "10px", padding: "16px", border: "1px solid rgba(228,220,209,0.06)" }}>
                <p className="font-montserrat text-white/60" style={{ fontSize: "13px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {item.videoTranscript}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── WORKBOOK ── */}
      {isWorkbook && (
        <>
          {/* Banner image at top */}
          {bannerSrc && (
            <div className="relative" style={{ margin: "14px 0 0", height: "220px", background: heroBg, overflow: "hidden" }}>
              <Image src={bannerSrc} alt={item.title} fill style={{ objectFit: "cover" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(34,34,34,0.4) 100%)" }} />
            </div>
          )}

          {/* Type pill + categories */}
          <div style={{ padding: "16px 20px 0", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
            <span className="font-montserrat font-semibold uppercase" style={{ fontSize: "9px", letterSpacing: "0.10em", background: pillStyle.bg, color: pillStyle.text, padding: "3px 10px", borderRadius: "20px" }}>
              {pillStyle.label}
            </span>
            {item.categories.map((cat) => (
              <button
                key={cat}
                onClick={() => router.push(`/learn?category=${cat}`)}
                className="font-montserrat font-semibold uppercase"
                style={{ fontSize: "9px", letterSpacing: "0.08em", background: "#333333", color: "#706b6b", padding: "3px 8px", borderRadius: "20px", cursor: "pointer", border: "none" }}
              >
                {cat.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {/* Title */}
          <h1 className="font-playfair italic font-normal text-white" style={{ fontSize: "22px", lineHeight: 1.25, padding: "16px 20px 4px" }}>
            {item.title}
          </h1>

          {/* Meta row */}
          <div style={{ padding: "0 20px 12px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
            {publishedDate && <span className="font-montserrat" style={{ fontSize: "11px", color: "#706b6b" }}>{publishedDate}</span>}
            {item.readingTimeMinutes && <span className="font-montserrat" style={{ fontSize: "11px", color: "#706b6b" }}>{item.readingTimeMinutes} min read</span>}
          </div>

          {/* Body/description */}
          {item.body && (
            <div style={{ padding: "0 20px 16px" }}>
              <div className="rich-content" dangerouslySetInnerHTML={{ __html: item.body }} />
            </div>
          )}

          {/* Action boxes */}
          <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* PDF download */}
            {item.pdfUrl && (
              <div
                onClick={triggerPdfDownload}
                style={{ background: "#2a2a2a", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer" }}
              >
                <div style={{ width: "40px", height: "40px", background: "#333333", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Download size={18} color="#e4dcd1" />
                </div>
                <div style={{ flex: 1 }}>
                  <p className="font-montserrat font-semibold text-white" style={{ fontSize: "14px" }}>Download PDF</p>
                  <p className="font-montserrat" style={{ fontSize: "11px", color: "#706b6b" }}>Tap to download</p>
                </div>
                <ChevronRight size={16} color="#706b6b" />
              </div>
            )}

            {/* Editable template */}
            {item.editableTemplateUrl && (
              <div
                onClick={() => window.open(item.editableTemplateUrl!, "_blank")}
                style={{ background: "rgba(155,126,86,0.1)", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer" }}
              >
                <div style={{ width: "40px", height: "40px", background: "rgba(155,126,86,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ExternalLink size={18} color="#9b7e56" />
                </div>
                <div style={{ flex: 1 }}>
                  <p className="font-montserrat font-semibold text-white" style={{ fontSize: "14px" }}>Open Editable Template</p>
                  <p className="font-montserrat" style={{ fontSize: "11px", color: "#706b6b" }}>{getTemplatePlatform(item.editableTemplateUrl)}</p>
                </div>
                <ChevronRight size={16} color="#706b6b" />
              </div>
            )}
          </div>
        </>
      )}

      {/* ── BLOG POST / COURSE / INDUSTRY UPDATE ── */}
      {!isVideo && !isWorkbook && (
        <>
          {/* Banner / hero */}
          <div
            className="relative"
            style={{ height: bannerSrc ? "220px" : "160px", margin: "14px 0 0", background: heroBg }}
          >
            {bannerSrc && <Image src={bannerSrc} alt={item.title} fill style={{ objectFit: "cover" }} />}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(34,34,34,0.85) 100%)" }} />
            <div className="absolute top-4 left-4">
              <span className="font-montserrat font-semibold uppercase" style={{ fontSize: "9px", letterSpacing: "0.10em", background: "rgba(34,34,34,0.75)", color: "#e4dcd1", padding: "4px 12px", borderRadius: "20px", backdropFilter: "blur(4px)" }}>
                {pillStyle.label}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0" style={{ padding: "0 20px 18px" }}>
              <h1 className="font-playfair italic font-normal text-white" style={{ fontSize: "22px", lineHeight: 1.25 }}>
                {item.title}
              </h1>
            </div>
          </div>

          {/* Type pill + categories */}
          <div style={{ padding: "16px 20px 0", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
            {item.categories.map((cat) => (
              <button
                key={cat}
                onClick={() => router.push(`/learn?category=${cat}`)}
                className="font-montserrat font-semibold uppercase"
                style={{ fontSize: "9px", letterSpacing: "0.08em", background: "#333333", color: "#706b6b", padding: "3px 8px", borderRadius: "20px", cursor: "pointer", border: "none" }}
              >
                {cat.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {/* Meta row */}
          <div style={{ padding: "12px 20px 12px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
            {publishedDate && <span className="font-montserrat" style={{ fontSize: "11px", color: "#706b6b" }}>{publishedDate}</span>}
            {item.readingTimeMinutes && <span className="font-montserrat" style={{ fontSize: "11px", color: "#706b6b" }}>{item.readingTimeMinutes} min read</span>}
          </div>

          {/* Body */}
          {item.body && (
            <div style={{ padding: "0 20px 16px" }}>
              <div className="rich-content" dangerouslySetInnerHTML={{ __html: item.body }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
