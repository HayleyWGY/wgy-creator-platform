"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Download, Link as LinkIcon, Clock, Play } from "lucide-react";

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

function getTemplatePlatform(url: string): string {
  if (url.includes("canva.com")) return "Opens in Canva";
  if (url.includes("google.com")) return "Opens in Google";
  return "Open link";
}

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

      {/* Workbook: header card */}
      {isWorkbook && (
        <div style={{ padding: "16px 20px 0" }}>
          <div style={{ background: "#2a2a2a", borderRadius: "12px", padding: "20px", border: "1px solid rgba(228,220,209,0.08)" }}>
            <span className="font-montserrat font-semibold uppercase" style={{ fontSize: "9px", letterSpacing: "0.10em", background: pillStyle.bg, color: pillStyle.text, padding: "3px 10px", borderRadius: "20px" }}>
              {pillStyle.label}
            </span>
            <h1 className="font-playfair italic font-normal text-white mt-3" style={{ fontSize: "22px", lineHeight: 1.25 }}>
              {item.title}
            </h1>
            {item.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {item.categories.map((cat) => (
                  <span key={cat} className="font-montserrat font-semibold uppercase" style={{ fontSize: "9px", letterSpacing: "0.08em", background: "#333", color: "#706b6b", padding: "3px 10px", borderRadius: "20px" }}>
                    {cat.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}

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
                  marginTop: "16px",
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
        </div>
      )}

      {/* Non-workbook: banner / hero */}
      {!isWorkbook && (
        <div
          className="relative"
          style={{ height: bannerSrc ? "220px" : "160px", margin: "14px 0 0", background: heroBg }}
        >
          {bannerSrc && <Image src={bannerSrc} alt={item.title} fill style={{ objectFit: "cover" }} />}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(34,34,34,0.85) 100%)" }} />

          {/* Type badge */}
          <div className="absolute top-4 left-4">
            <span
              className="font-montserrat font-semibold uppercase"
              style={{ fontSize: "9px", letterSpacing: "0.10em", background: "rgba(34,34,34,0.75)", color: "#e4dcd1", padding: "4px 12px", borderRadius: "20px", backdropFilter: "blur(4px)" }}
            >
              {pillStyle.label}
            </span>
          </div>

          {/* Play overlay for video */}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: "60px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(228,220,209,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Play size={18} color="#e4dcd1" fill="#e4dcd1" />
              </div>
            </div>
          )}

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0" style={{ padding: "0 20px 18px" }}>
            <h1 className="font-playfair italic font-normal text-white" style={{ fontSize: "22px", lineHeight: 1.25 }}>
              {item.title}
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              {item.readingTimeMinutes && (
                <div className="flex items-center gap-1">
                  <Clock size={11} color="#706b6b" />
                  <span className="font-montserrat text-white/40" style={{ fontSize: "11px" }}>{item.readingTimeMinutes} min read</span>
                </div>
              )}
              {item.categories.map((cat) => (
                <span key={cat} className="font-montserrat font-semibold uppercase text-white/30" style={{ fontSize: "9px", letterSpacing: "0.08em" }}>
                  {cat.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Video embed */}
      {isVideo && item.videoEmbedUrl && (
        <div style={{ padding: "20px 20px 0" }}>
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: "10px", overflow: "hidden" }}>
            <iframe
              src={item.videoEmbedUrl}
              title={item.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
            />
          </div>
        </div>
      )}

      {/* Body (all types) */}
      {item.body && (
        <div style={{ padding: "24px 20px 0" }}>
          <div className="rich-content" dangerouslySetInnerHTML={{ __html: item.body }} />
        </div>
      )}

      {/* Video transcript */}
      {isVideo && item.videoTranscript && (
        <div style={{ padding: "24px 20px 0" }}>
          <p className="font-montserrat font-bold uppercase text-white/30 mb-3" style={{ fontSize: "9px", letterSpacing: "0.12em" }}>Notes</p>
          <div style={{ background: "#2a2a2a", borderRadius: "10px", padding: "16px", border: "1px solid rgba(228,220,209,0.06)" }}>
            <p className="font-montserrat text-white/60" style={{ fontSize: "13px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {item.videoTranscript}
            </p>
          </div>
        </div>
      )}

      {/* Category tags (non-workbook) */}
      {item.categories.length > 0 && !isWorkbook && (
        <div style={{ padding: "24px 20px 0" }}>
          <div className="flex flex-wrap gap-2">
            {item.categories.map((cat) => (
              <span
                key={cat}
                className="font-montserrat font-semibold uppercase"
                style={{ fontSize: "9px", letterSpacing: "0.08em", background: "#2a2a2a", color: "#706b6b", padding: "4px 12px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {cat.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
