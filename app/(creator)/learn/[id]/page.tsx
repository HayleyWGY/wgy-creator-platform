"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Download, ExternalLink, Clock, BookOpen, Play } from "lucide-react";

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
  bannerImageUrl: string | null;
  body: string | null;
  pdfUrl: string | null;
  editableTemplateUrl: string | null;
  videoEmbedUrl: string | null;
  videoTranscript: string | null;
}

const SECTION_LABELS: Record<string, string> = {
  pitching: "Pitching & Outreach",
  content: "Content Creation",
  "brand-deals": "Brand Deals",
  growth: "Growth",
  mindset: "Mindset & Business",
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

  const bannerSrc = item.bannerImageUrl || item.thumbnailUrl;

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

      {/* Banner / hero */}
      {(item.contentType === "article" || item.contentType === "video") && (
        <div
          className="relative"
          style={{
            height: bannerSrc ? "220px" : "160px",
            margin: "14px 0 0",
            background: item.contentType === "video" ? "#3d3550" : "#2e3e2e",
          }}
        >
          {bannerSrc && (
            <Image src={bannerSrc} alt={item.title} fill style={{ objectFit: "cover" }} />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(34,34,34,0.85) 100%)" }} />

          {/* Section badge */}
          <div className="absolute top-4 left-4">
            <span
              className="font-montserrat font-semibold uppercase"
              style={{
                fontSize: "9px",
                letterSpacing: "0.10em",
                background: "rgba(34,34,34,0.75)",
                color: "#e4dcd1",
                padding: "4px 12px",
                borderRadius: "20px",
                backdropFilter: "blur(4px)",
              }}
            >
              {SECTION_LABELS[item.section] ?? item.section}
            </span>
          </div>

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0" style={{ padding: "0 20px 18px" }}>
            <h1 className="font-playfair italic font-normal text-white" style={{ fontSize: "22px", lineHeight: 1.25 }}>
              {item.title}
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              {item.contentType === "article" && item.readingTimeMinutes && (
                <div className="flex items-center gap-1">
                  <Clock size={11} color="#706b6b" />
                  <span className="font-montserrat text-white/40" style={{ fontSize: "11px" }}>{item.readingTimeMinutes} min read</span>
                </div>
              )}
              {item.contentType === "video" && (
                <div className="flex items-center gap-1">
                  <Play size={11} color="#706b6b" />
                  <span className="font-montserrat text-white/40" style={{ fontSize: "11px" }}>Video</span>
                </div>
              )}
              {item.categories.map((cat) => (
                <span key={cat} className="font-montserrat font-semibold uppercase text-white/30" style={{ fontSize: "9px", letterSpacing: "0.08em" }}>
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PDF / Template — simple header card */}
      {(item.contentType === "pdf" || item.contentType === "template") && (
        <div style={{ padding: "16px 20px 0" }}>
          <div
            style={{
              background: "#2a2a2a",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid rgba(228,220,209,0.08)",
            }}
          >
            <span
              className="font-montserrat font-semibold uppercase"
              style={{ fontSize: "9px", letterSpacing: "0.10em", color: item.contentType === "pdf" ? "#27AE60" : "#9b7e56" }}
            >
              {item.contentType === "pdf" ? "PDF Guide" : "Template"} · {SECTION_LABELS[item.section] ?? item.section}
            </span>
            <h1 className="font-playfair italic font-normal text-white mt-2" style={{ fontSize: "22px", lineHeight: 1.25 }}>
              {item.title}
            </h1>
            {item.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {item.categories.map((cat) => (
                  <span
                    key={cat}
                    className="font-montserrat font-semibold uppercase"
                    style={{ fontSize: "9px", letterSpacing: "0.08em", background: "#333", color: "#706b6b", padding: "3px 10px", borderRadius: "20px" }}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {/* CTA */}
            <div style={{ marginTop: "16px" }}>
              {item.contentType === "pdf" && item.pdfUrl && (
                <a
                  href={item.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 font-montserrat font-semibold uppercase"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.10em",
                    background: "#e4dcd1",
                    color: "#222222",
                    padding: "12px 20px",
                    borderRadius: "8px",
                    display: "inline-flex",
                    textDecoration: "none",
                  }}
                >
                  <Download size={14} />
                  Download PDF
                </a>
              )}
              {item.contentType === "template" && item.editableTemplateUrl && (
                <a
                  href={item.editableTemplateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 font-montserrat font-semibold uppercase"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.10em",
                    background: "#e4dcd1",
                    color: "#222222",
                    padding: "12px 20px",
                    borderRadius: "8px",
                    display: "inline-flex",
                    textDecoration: "none",
                  }}
                >
                  <ExternalLink size={14} />
                  Open Template
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video embed */}
      {item.contentType === "video" && item.videoEmbedUrl && (
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

      {/* Article body */}
      {item.contentType === "article" && item.body && (
        <div style={{ padding: "24px 20px 0" }}>
          <div
            className="rich-content"
            dangerouslySetInnerHTML={{ __html: item.body }}
          />
        </div>
      )}

      {/* Video transcript */}
      {item.contentType === "video" && item.videoTranscript && (
        <div style={{ padding: "24px 20px 0" }}>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={14} color="#706b6b" />
            <span className="font-montserrat font-bold uppercase text-white/30" style={{ fontSize: "9px", letterSpacing: "0.12em" }}>Notes</span>
          </div>
          <div
            style={{
              background: "#2a2a2a",
              borderRadius: "10px",
              padding: "16px",
              border: "1px solid rgba(228,220,209,0.06)",
            }}
          >
            <p className="font-montserrat text-white/60" style={{ fontSize: "13px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {item.videoTranscript}
            </p>
          </div>
        </div>
      )}

      {/* Categories */}
      {item.categories.length > 0 && item.contentType !== "pdf" && item.contentType !== "template" && (
        <div style={{ padding: "24px 20px 0" }}>
          <div className="flex flex-wrap gap-2">
            {item.categories.map((cat) => (
              <span
                key={cat}
                className="font-montserrat font-semibold uppercase"
                style={{ fontSize: "9px", letterSpacing: "0.08em", background: "#2a2a2a", color: "#706b6b", padding: "4px 12px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
