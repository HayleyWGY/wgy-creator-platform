"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eyebrow } from "@/components/ui/eyebrow";

interface HubItem {
  id: string;
  title: string;
  section: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  readingTimeMinutes: number | null;
}

const TABS = [
  { label: "ABOUT",   value: "about" },
  { label: "FAQS",    value: "faq" },
  { label: "UPDATES", value: "updates" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const EMPTY_COPY: Record<TabValue, string> = {
  about:   "About posts are on their way.",
  faq:     "FAQs are on their way.",
  updates: "No updates yet — check back soon.",
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function AboutPageInner() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<TabValue>(
    TABS.some((t) => t.value === initialTab) ? (initialTab as TabValue) : "about"
  );
  const [items, setItems] = useState<Record<string, HubItem[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(
      TABS.map((t) =>
        fetch(`/api/content?status=published&section=${t.value}`)
          .then((r) => r.json())
          .then((data: HubItem[]) => [t.value, Array.isArray(data) ? data : []] as const)
          .catch(() => [t.value, []] as const)
      )
    )
      .then((entries) => setItems(Object.fromEntries(entries)))
      .finally(() => setLoading(false));
  }, []);

  const list = items[activeTab] ?? [];

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "24px 20px 16px" }}>
        <Eyebrow style={{ marginBottom: 8 }}>About</Eyebrow>
        <h2 className="text-heading-large" style={{ margin: 0 }}>
          The <em className="font-accent">essentials</em>
        </h2>
        <p className="font-montserrat" style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.5 }}>
          How the app works, answers to common questions, and the latest from the WGY team.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-5 pb-5">
        {TABS.map((t) => {
          const isActive = activeTab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              className="flex-none font-montserrat uppercase transition-colors"
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                padding: "6px 16px",
                borderRadius: "var(--radius-pill)",
                background: isActive ? "var(--pill-bg)" : "transparent",
                color: isActive ? "var(--pill-text)" : "var(--text-muted)",
                border: isActive ? "1px solid var(--pill-bg)" : "1px solid var(--border-strong)",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="flex flex-col gap-3 px-5 pb-8">
        {loading ? (
          [1, 2].map((i) => (
            <div key={i} style={{ height: "88px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", opacity: 0.5 }} />
          ))
        ) : list.length === 0 ? (
          <div className="text-center py-14">
            <p className="font-montserrat" style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}>
              {EMPTY_COPY[activeTab]}
            </p>
          </div>
        ) : (
          list.map((item) => (
            <Link
              key={item.id}
              href={`/about/${item.id}`}
              className="flex items-center gap-3 overflow-hidden"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "14px", textDecoration: "none" }}
            >
              {item.thumbnailUrl && (
                <div className="relative flex-none overflow-hidden" style={{ width: "60px", height: "60px", borderRadius: "12px" }}>
                  <Image src={item.thumbnailUrl} alt="" fill style={{ objectFit: "cover" }} />
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <h3 className="font-montserrat leading-snug" style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--text)", margin: 0 }}>
                  {item.title}
                </h3>
                <p className="font-montserrat mt-1" style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)" }}>
                  {activeTab === "updates" && formatDate(item.publishedAt)
                    ? formatDate(item.publishedAt)
                    : item.readingTimeMinutes
                      ? `${item.readingTimeMinutes} min read`
                      : "Read"}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <Suspense>
      <AboutPageInner />
    </Suspense>
  );
}
