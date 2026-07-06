"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";

interface HubItem {
  id: string;
  title: string;
  section: string;
  body: string | null;
  bannerImageUrl: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  readingTimeMinutes: number | null;
}

const SECTION_EYEBROW: Record<string, string> = {
  about:   "About",
  faq:     "FAQs",
  updates: "Updates",
};

export default function AboutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<HubItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/content/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setItem(data && data.status === "published" ? data : null))
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="px-5 pt-6">
        <div style={{ height: "200px", background: "var(--surface)", borderRadius: "var(--radius-card)", opacity: 0.5 }} />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="px-5 pt-8 text-center">
        <p className="font-montserrat" style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>Post not found</p>
        <button
          onClick={() => router.push("/about")}
          className="font-montserrat mt-3"
          style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}
        >
          ← Back to About
        </button>
      </div>
    );
  }

  const banner = item.bannerImageUrl || item.thumbnailUrl;

  return (
    <div className="pb-10">
      {/* Back */}
      <div className="px-5 pt-5">
        <button
          onClick={() => router.push(`/about?tab=${item.section === "faq" ? "faq" : item.section}`)}
          className="flex items-center gap-1.5 font-montserrat"
          style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <ArrowLeft size={15} strokeWidth={1.5} /> Back
        </button>
      </div>

      {/* Banner */}
      {banner && (
        <div className="relative mx-5 mt-4 overflow-hidden" style={{ height: "170px", borderRadius: "var(--radius-card)" }}>
          <Image src={banner} alt={item.title} fill style={{ objectFit: "cover" }} />
        </div>
      )}

      {/* Title */}
      <div className="px-5 pt-5">
        <Eyebrow style={{ marginBottom: 8 }}>{SECTION_EYEBROW[item.section] ?? "About"}</Eyebrow>
        <h1 className="font-montserrat leading-tight" style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", margin: 0 }}>
          {item.title}
        </h1>
        {item.publishedAt && item.section === "updates" && (
          <p className="font-montserrat mt-2" style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {new Date(item.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </div>

      {/* Body */}
      {item.body && (
        <div className="px-5 pt-4">
          <div className="rich-content" dangerouslySetInnerHTML={{ __html: item.body }} />
        </div>
      )}
    </div>
  );
}
