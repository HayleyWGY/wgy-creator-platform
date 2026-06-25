"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Download, ExternalLink, ChevronRight } from "lucide-react";
import { getEmbedUrl } from "@/lib/utils";
import { CONTENT_TYPE_LABEL } from "@/lib/constants";

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

const heroPillStyle: React.CSSProperties = {
  fontSize: "9px", fontWeight: 800, letterSpacing: "0.12em",
  background: "rgba(17,17,17,0.75)", color: "#e4dcd1",
  padding: "4px 12px", borderRadius: "var(--radius-pill)", backdropFilter: "blur(4px)",
};

const catBtnStyle: React.CSSProperties = {
  fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em",
  background: "var(--surface-2)", color: "var(--text-muted)",
  padding: "4px 8px", borderRadius: "var(--radius-pill)", cursor: "pointer", border: "none",
};

const heroTitleStyle: React.CSSProperties = {
  fontSize: "22px", fontWeight: 800, lineHeight: 1.2, color: "#ffffff", margin: 0,
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
        <div style={{ height: "220px", background: "var(--surface)", borderRadius: "var(--radius-card)", marginBottom: "16px" }} />
        <div style={{ height: "24px", background: "var(--surface)", borderRadius: "6px", marginBottom: "8px", width: "70%" }} />
        <div style={{ height: "16px", background: "var(--surface)", borderRadius: "6px", width: "40%" }} />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <p className="font-montserrat" style={{ fontSize: "20px", fontWeight: 800, color: "var(--text)" }}>Content not found</p>
        <button onClick={() => router.back()} className="font-montserrat mt-4" style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent)" }}>
          Go back
        </button>
      </div>
    );
  }

  const label = CONTENT_TYPE_LABEL[item.contentType] ?? item.contentType.replace(/_/g, " ");
  const heroBg = "linear-gradient(140deg, var(--img-b), var(--img-a))";
  const bannerSrc = item.bannerImageUrl || item.thumbnailUrl;
  const isWorkbook = item.contentType === "workbook";
  const isVideo = item.contentType === "video";

  function triggerPdfDownload() {
    if (!item?.pdfUrl) return;
    window.open(item.pdfUrl, "_blank");
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
          className="flex items-center gap-2 transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={16} />
          <span className="font-montserrat" style={{ fontSize: "12px", fontWeight: 600 }}>Back</span>
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
            <span className="font-montserrat uppercase" style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.12em", background: "var(--beige)", color: "#111111", padding: "4px 10px", borderRadius: "var(--radius-pill)" }}>
              {label}
            </span>
            {item.categories.map((cat) => (
              <button
                key={cat}
                onClick={() => router.push(`/learn?category=${cat}`)}
                className="font-montserrat uppercase"
                style={catBtnStyle}
              >
                {cat.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {/* Title */}
          <h1 className="font-montserrat" style={{ fontSize: "22px", fontWeight: 800, lineHeight: 1.2, color: "var(--text)", padding: "16px 20px 4px", margin: 0 }}>
            {item.title}
          </h1>

          {/* Meta row */}
          <div style={{ padding: "0 20px 12px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
            {publishedDate && <span className="font-montserrat" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{publishedDate}</span>}
            {item.readingTimeMinutes && <span className="font-montserrat" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{item.readingTimeMinutes} min read</span>}
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
              <p className="eyebrow mb-3">Notes</p>
              <div style={{ background: "var(--surface)", borderRadius: "10px", padding: "16px", border: "1px solid var(--border)" }}>
                <p className="font-montserrat" style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
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
          {/* Banner / hero — title overlaid like other types */}
          <div
            className="relative"
            style={{ height: bannerSrc ? "220px" : "160px", margin: "14px 0 0", background: heroBg }}
          >
            {bannerSrc && <Image src={bannerSrc} alt={item.title} fill style={{ objectFit: "cover" }} />}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.78) 100%)" }} />
            <div className="absolute top-4 left-4">
              <span className="font-montserrat uppercase" style={heroPillStyle}>
                {label}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0" style={{ padding: "0 20px 18px" }}>
              <h1 className="font-montserrat" style={heroTitleStyle}>
                {item.title}
              </h1>
            </div>
          </div>

          {/* Categories */}
          <div style={{ padding: "16px 20px 0", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
            {item.categories.map((cat) => (
              <button
                key={cat}
                onClick={() => router.push(`/learn?category=${cat}`)}
                className="font-montserrat uppercase"
                style={catBtnStyle}
              >
                {cat.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {/* Meta row */}
          <div style={{ padding: "0 20px 12px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
            {publishedDate && <span className="font-montserrat" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{publishedDate}</span>}
            {item.readingTimeMinutes && <span className="font-montserrat" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{item.readingTimeMinutes} min read</span>}
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
                style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer" }}
              >
                <div style={{ width: "40px", height: "40px", background: "var(--surface-2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Download size={18} style={{ color: "var(--accent)" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p className="font-montserrat" style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>View PDF</p>
                  <p className="font-montserrat" style={{ fontSize: "11px", color: "var(--text-muted)" }}>Opens in new tab</p>
                </div>
                <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
              </div>
            )}

            {/* Editable template */}
            {item.editableTemplateUrl && (
              <div
                onClick={() => window.open(item.editableTemplateUrl!, "_blank")}
                style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer" }}
              >
                <div style={{ width: "40px", height: "40px", background: "var(--surface-2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ExternalLink size={18} style={{ color: "var(--accent)" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p className="font-montserrat" style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Open Editable Template</p>
                  <p className="font-montserrat" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{getTemplatePlatform(item.editableTemplateUrl)}</p>
                </div>
                <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
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
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.78) 100%)" }} />
            <div className="absolute top-4 left-4">
              <span className="font-montserrat uppercase" style={heroPillStyle}>
                {label}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0" style={{ padding: "0 20px 18px" }}>
              <h1 className="font-montserrat" style={heroTitleStyle}>
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
                className="font-montserrat uppercase"
                style={catBtnStyle}
              >
                {cat.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {/* Meta row */}
          <div style={{ padding: "12px 20px 12px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
            {publishedDate && <span className="font-montserrat" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{publishedDate}</span>}
            {item.readingTimeMinutes && <span className="font-montserrat" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{item.readingTimeMinutes} min read</span>}
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
