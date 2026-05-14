"use client";

import Image from "next/image";
import { Heart, MessageCircle, Bell } from "lucide-react";
import { useState } from "react";

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
    <div className={`bg-[#2a2a2a] rounded-card overflow-hidden relative ${className}`}>
      {/* Image area — fixed 140px height */}
      <div
        className="relative w-full"
        style={{ height: "140px", backgroundColor: imageBg }}
      >
        {coverImageUrl && (
          <Image
            src={coverImageUrl}
            alt={brandName}
            fill
            style={{ objectFit: "cover" }}
          />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.66) 40%, rgba(0,0,0,0.78) 100%)" }} />
        {/* Brand name centred over image */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-playfair font-normal text-white text-xl leading-tight px-4 text-center"
            style={{ letterSpacing: "0.04em" }}
          >
            {brandName}
          </span>
        </div>

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
              <Bell size={16} color="#e4dcd1" strokeWidth={1.5} />
            </button>
            {tooltipVisible && (
              <div
                className="absolute right-0 top-6 w-[180px] rounded-[8px] px-3 py-2 text-[10px] font-montserrat font-normal z-10"
                style={{
                  background: "#333333",
                  color: "#e4dcd1",
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
          className="inline-block px-[10px] py-[3px] rounded-pill font-montserrat font-semibold uppercase self-start"
          style={{ fontSize: "9px", letterSpacing: "0.10em", background: "#706b6b", color: "#e4dcd1" }}
        >
          {campaignType}
        </span>

        <p className="font-playfair font-normal text-white leading-snug" style={{ fontSize: "13px" }}>
          {title}
        </p>

        <div className="flex items-center gap-3 font-montserrat font-normal" style={{ color: "#706b6b", fontSize: "10px" }}>
          <span className="flex items-center gap-1"><Heart size={11} />{likesCount}</span>
          <span className="flex items-center gap-1"><MessageCircle size={11} />{commentsCount}</span>
          <span>{timestamp}</span>
        </div>
      </div>
    </div>
  );
}
