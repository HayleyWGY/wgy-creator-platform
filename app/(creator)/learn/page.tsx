"use client";

import { Search, Play, Heart, Bookmark, FileText, Download, GraduationCap } from "lucide-react";
import { useState } from "react";
import { LEARN_FILTERS } from "@/lib/constants";

export default function LearnPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [liked1, setLiked1] = useState(false);
  const [bookmarked1, setBookmarked1] = useState(false);
  const [liked3, setLiked3] = useState(false);
  const [bookmarked3, setBookmarked3] = useState(false);

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "20px 20px 16px" }}>
        <h1 className="text-page-heading text-white">
          Learning Lounge
        </h1>
      </div>

      {/* Search bar */}
      <div
        className="relative flex items-center"
        style={{ margin: "0 20px 16px", height: "44px" }}
      >
        <Search
          size={16}
          color="#706b6b"
          className="absolute left-4"
          style={{ pointerEvents: "none" }}
        />
        <input
          type="text"
          placeholder="Search resources..."
          className="w-full h-full font-montserrat font-normal outline-none"
          style={{
            background: "#2a2a2a",
            borderRadius: "8px",
            paddingLeft: "44px",
            paddingRight: "16px",
            fontSize: "13px",
            color: "#ffffff",
            caretColor: "#e4dcd1",
          }}
        />
        <style>{`input::placeholder { color: #706b6b; }`}</style>
      </div>

      {/* Filter pills */}
      <div
        className="flex gap-2 overflow-x-auto"
        style={{ padding: "0 20px 20px", scrollbarWidth: "none" }}
      >
        {LEARN_FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className="flex-none font-montserrat font-semibold uppercase transition-colors"
              style={{
                fontSize: "9px",
                letterSpacing: "0.10em",
                padding: "5px 14px",
                borderRadius: "20px",
                background: isActive ? "#e4dcd1" : "transparent",
                color: isActive ? "#222222" : "#706b6b",
                border: isActive ? "none" : "1px solid rgba(228,220,209,0.25)",
              }}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Content cards */}
      <div
        className="flex flex-col"
        style={{ padding: "0 20px", gap: "12px" }}
      >
        {/* CARD 1 — Video */}
        <div
          style={{
            background: "#2a2a2a",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid rgba(228,220,209,0.08)",
          }}
        >
          {/* Thumbnail */}
          <div
            className="relative"
            style={{ height: "130px", background: "#3d3550" }}
          >
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.3)" }} />
            {/* Badge */}
            <div className="absolute top-3 left-3">
              <span
                className="font-montserrat font-semibold uppercase"
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.10em",
                  background: "#706b6b",
                  color: "#e4dcd1",
                  padding: "3px 10px",
                  borderRadius: "20px",
                }}
              >
                Video Library
              </span>
            </div>
            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="flex items-center justify-center"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "rgba(228,220,209,0.15)",
                }}
              >
                <Play size={16} color="#e4dcd1" fill="#e4dcd1" />
              </div>
            </div>
          </div>
          {/* Body */}
          <div style={{ padding: "12px" }}>
            <p
              className="font-playfair font-normal text-white"
              style={{ fontSize: "15px", lineHeight: 1.3 }}
            >
              Mastering Brand Negotiations
            </p>
            <p
              className="font-montserrat font-normal"
              style={{ fontSize: "11px", color: "#706b6b", marginTop: "4px" }}
            >
              45 min · 6 lessons
            </p>
            <div className="flex items-center gap-4" style={{ marginTop: "8px" }}>
              <button
                onClick={() => setLiked1(!liked1)}
                className="flex items-center gap-1.5"
              >
                <Heart
                  size={13}
                  fill={liked1 ? "#e4dcd1" : "none"}
                  color={liked1 ? "#e4dcd1" : "#706b6b"}
                />
                <span
                  className="font-montserrat font-normal"
                  style={{ fontSize: "11px", color: "#706b6b" }}
                >
                  26
                </span>
              </button>
              <button onClick={() => setBookmarked1(!bookmarked1)}>
                <Bookmark
                  size={13}
                  fill={bookmarked1 ? "#e4dcd1" : "none"}
                  color={bookmarked1 ? "#e4dcd1" : "#706b6b"}
                />
              </button>
            </div>
          </div>
        </div>

        {/* CARD 2 — Workbook */}
        <div
          className="flex items-center"
          style={{
            background: "#2a2a2a",
            borderRadius: "12px",
            padding: "14px",
            border: "1px solid rgba(228,220,209,0.08)",
            gap: "12px",
          }}
        >
          {/* Icon box */}
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: "48px",
              height: "48px",
              background: "#333333",
              borderRadius: "8px",
            }}
          >
            <FileText size={20} color="#e4dcd1" strokeWidth={1.5} />
          </div>
          {/* Content */}
          <div>
            <span
              className="font-montserrat font-semibold uppercase"
              style={{
                fontSize: "9px",
                letterSpacing: "0.10em",
                background: "#706b6b",
                color: "#e4dcd1",
                padding: "3px 10px",
                borderRadius: "20px",
              }}
            >
              Creator Workbooks
            </span>
            <p
              className="font-playfair font-normal text-white"
              style={{ fontSize: "14px", marginTop: "4px", lineHeight: 1.3 }}
            >
              2026 Creator Checklist
            </p>
            <button
              className="flex items-center gap-1.5"
              style={{ marginTop: "6px" }}
            >
              <Download size={14} color="#e4dcd1" strokeWidth={1.5} />
              <span
                className="font-montserrat font-semibold"
                style={{ fontSize: "11px", color: "#e4dcd1" }}
              >
                Download PDF
              </span>
            </button>
          </div>
        </div>

        {/* CARD 3 — Article */}
        <div
          style={{
            background: "#2a2a2a",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid rgba(228,220,209,0.08)",
          }}
        >
          {/* Thumbnail */}
          <div
            className="relative"
            style={{ height: "130px", background: "#4a5e4a" }}
          >
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.3)" }} />
            {/* Badge */}
            <div className="absolute top-3 left-3">
              <span
                className="font-montserrat font-semibold uppercase"
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.10em",
                  background: "#706b6b",
                  color: "#e4dcd1",
                  padding: "3px 10px",
                  borderRadius: "20px",
                }}
              >
                Social Tips
              </span>
            </div>
          </div>
          {/* Body */}
          <div style={{ padding: "12px" }}>
            <p
              className="font-playfair font-normal text-white"
              style={{ fontSize: "15px", lineHeight: 1.3 }}
            >
              10 Ways to Increase Your Engagement
            </p>
            <p
              className="font-montserrat font-normal"
              style={{ fontSize: "11px", color: "#706b6b", marginTop: "4px" }}
            >
              5 min read
            </p>
            <div className="flex items-center gap-4" style={{ marginTop: "8px" }}>
              <button
                onClick={() => setLiked3(!liked3)}
                className="flex items-center gap-1.5"
              >
                <Heart
                  size={13}
                  fill={liked3 ? "#e4dcd1" : "none"}
                  color={liked3 ? "#e4dcd1" : "#706b6b"}
                />
                <span
                  className="font-montserrat font-normal"
                  style={{ fontSize: "11px", color: "#706b6b" }}
                >
                  41
                </span>
              </button>
              <button onClick={() => setBookmarked3(!bookmarked3)}>
                <Bookmark
                  size={13}
                  fill={bookmarked3 ? "#e4dcd1" : "none"}
                  color={bookmarked3 ? "#e4dcd1" : "#706b6b"}
                />
              </button>
            </div>
          </div>
        </div>

        {/* CARD 4 — Course */}
        <div
          className="flex"
          style={{
            background: "#2a2a2a",
            borderRadius: "12px",
            padding: "14px",
            border: "1px solid rgba(228,220,209,0.08)",
            gap: "12px",
            alignItems: "flex-start",
          }}
        >
          {/* Icon box */}
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: "48px",
              height: "48px",
              background: "#222222",
              borderRadius: "8px",
              border: "1px solid #e4dcd1",
            }}
          >
            <GraduationCap size={20} color="#e4dcd1" strokeWidth={1.5} />
          </div>
          {/* Content */}
          <div>
            <span
              className="font-montserrat font-semibold uppercase"
              style={{
                fontSize: "9px",
                letterSpacing: "0.10em",
                background: "#706b6b",
                color: "#e4dcd1",
                padding: "3px 10px",
                borderRadius: "20px",
              }}
            >
              Course
            </span>
            <p
              className="font-playfair font-normal text-white"
              style={{ fontSize: "14px", marginTop: "4px", lineHeight: 1.3 }}
            >
              Ultimate Beginners Course
            </p>
            <p
              className="font-montserrat font-normal"
              style={{ fontSize: "11px", color: "#706b6b", marginTop: "4px" }}
            >
              8 lessons · Free with membership
            </p>
            <button style={{ marginTop: "6px" }}>
              <span
                className="font-montserrat font-semibold"
                style={{ fontSize: "11px", color: "#e4dcd1" }}
              >
                Start Course
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
