"use client";

import Image from "next/image";
import { Heart, MessageCircle, Bell } from "lucide-react";
import { useState } from "react";
import { WgyBadge } from "@/components/ui/wgy-badge";

interface CampaignCardProps {
  brandName: string;
  coverImageUrl?: string;
  imageBg?: string;
  campaignType: string;
  title: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  eventReminder?: boolean;
  eventDate?: string | null;
  compactBadge?: boolean;
  className?: string;
}

export function CampaignCard({
  brandName,
  coverImageUrl,
  imageBg = "#333333",
  campaignType,
  title,
  likesCount,
  commentsCount,
  timestamp,
  eventReminder = false,
  eventDate,
  compactBadge = false,
  className = "",
}: CampaignCardProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const isEvent = campaignType === "event" || campaignType === "Event";

  let eventDay: string | null = null;
  let eventMonth: string | null = null;
  if (isEvent && eventDate) {
    const d = new Date(eventDate);
    eventDay = d.getDate().toString().padStart(2, "0");
    eventMonth = d.toLocaleString("en-GB", { month: "short" }).toUpperCase();
  }

  return (
    <div
      className={`overflow-hidden relative ${className}`}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)" }}
    >
      {/* Image area — fixed 150px height */}
      <div
        className="relative w-full grid place-items-center"
        style={{ height: "150px", background: coverImageUrl ? imageBg : "linear-gradient(140deg, var(--img-a), var(--img-b))" }}
      >
        {coverImageUrl && (
          <Image
            src={coverImageUrl}
            alt={brandName}
            fill
            style={{ objectFit: "cover" }}
          />
        )}
        {coverImageUrl && (
          /* Gradient overlay only when there's a cover image */
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%)" }} />
        )}
        {coverImageUrl ? (
          /* Brand name centred over the cover image */
          <span
            className="font-playfair text-white text-xl leading-tight px-4 text-center relative"
            style={{ fontStyle: "italic", letterSpacing: "0.01em" }}
          >
            {brandName}
          </span>
        ) : (
          /* No cover image — WGY badge anchors the placeholder media */
          <WgyBadge size={46} />
        )}

        {/* WGY badge on cover images sits bottom-right */}
        {coverImageUrl && (
          <div style={{ position: "absolute", bottom: 10, right: 10, zIndex: 10 }}>
            <WgyBadge size={34} />
          </div>
        )}

        {/* Event date badge */}
        {isEvent && eventDay && eventMonth && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              zIndex: 10,
              background: "rgba(228,220,209,0.95)",
              borderRadius: "50%",
              width: compactBadge ? "39px" : "52px",
              height: compactBadge ? "39px" : "52px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            <span className="font-montserrat font-bold" style={{ fontSize: compactBadge ? "12px" : "16px", color: "#222222", lineHeight: 1 }}>
              {eventDay}
            </span>
            <span className="font-montserrat font-semibold uppercase" style={{ fontSize: compactBadge ? "6px" : "8px", color: "#706b6b", letterSpacing: "0.08em" }}>
              {eventMonth}
            </span>
          </div>
        )}

        {/* Event reminder bell */}
        {eventReminder && (
          <div className="absolute top-2 right-2 relative">
            <button
              onClick={() => setTooltipVisible(!tooltipVisible)}
              className="flex items-center justify-center"
            >
              <Bell size={16} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
            </button>
            {tooltipVisible && (
              <div
                className="absolute right-0 top-6 w-[180px] rounded-[8px] px-3 py-2 text-[10px] font-montserrat font-normal z-10"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  lineHeight: 1.5,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                }}
              >
                You&apos;ll be reminded 30 mins before
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
        <span
          className="inline-block font-montserrat uppercase self-start"
          style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.12em", padding: "5px 9px", borderRadius: "var(--radius-pill)", background: "var(--beige)", color: "#111111" }}
        >
          {campaignType}
        </span>

        <h3 className="font-montserrat leading-snug" style={{ fontSize: "15px", fontWeight: 800, color: "var(--text)", margin: 0 }}>
          {title}
        </h3>

        <p className="font-montserrat uppercase" style={{ fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.04em", color: "var(--text-muted)", margin: 0 }}>
          WGY Ltd · {timestamp}
        </p>

        <div className="flex items-center gap-4 font-montserrat" style={{ color: "var(--text-muted)", fontSize: "12px", fontWeight: 600, marginTop: 2 }}>
          <span className="flex items-center gap-1"><Heart size={13} strokeWidth={1.8} />{likesCount}</span>
          <span className="flex items-center gap-1"><MessageCircle size={13} strokeWidth={1.8} />{commentsCount}</span>
        </div>
      </div>
    </div>
  );
}
