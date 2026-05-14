"use client";

import { Heart, MessageCircle, Bookmark, Image } from "lucide-react";
import { useState } from "react";
import { PillTag } from "@/components/ui/pill-tag";

const ROOMS = [
  { emoji: "💬", name: "Group Chat",                   sub: "830 members",       unread: 3  },
  { emoji: "🔗", name: "Share Your Social Links",      sub: "2,609 posts"                   },
  { emoji: "💰", name: "Affiliate Links",              sub: "No new messages"               },
  { emoji: "👀", name: "Looking for Creator Collabs",  sub: "105 posts",         unread: 1  },
  { emoji: "🎪", name: "Events Chat",                  sub: "15 posts"                      },
  { emoji: "⭐", name: "The Creator Corner",           sub: "11 posts",          unread: 11 },
];

export default function CommunityPage() {
  const [liked1, setLiked1]         = useState(false);
  const [bookmarked1, setBookmarked1] = useState(false);
  const [liked2, setLiked2]         = useState(false);
  const [bookmarked2, setBookmarked2] = useState(false);

  return (
    <div>
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-page-heading text-white">Community</h1>
      </div>

      {/* Chat Rooms label */}
      <div className="px-5 mb-2">
        <span className="text-section-label">Chat Rooms</span>
      </div>

      {/* Rooms list */}
      <div>
        {ROOMS.map((room, i) => (
          <div key={i}>
            <button
              className="w-full flex items-center gap-3 px-5 py-[14px] text-left transition-opacity active:opacity-70"
              style={{ background: "#222222" }}
            >
              <div className="w-10 h-10 flex-none flex items-center justify-center" style={{ background: "#2a2a2a", borderRadius: "10px" }}>
                <span style={{ fontSize: "20px" }}>{room.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-montserrat font-semibold text-white leading-tight" style={{ fontSize: "13px" }}>
                  {room.name}
                </p>
                <p className="font-montserrat font-normal mt-0.5" style={{ fontSize: "11px", color: "#706b6b" }}>
                  {room.sub}
                </p>
              </div>
              {room.unread && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-none" style={{ background: "#e4dcd1" }}>
                  <span className="font-montserrat font-bold" style={{ fontSize: "9px", color: "#222222" }}>
                    {room.unread > 9 ? "9+" : room.unread}
                  </span>
                </div>
              )}
            </button>
            {i < ROOMS.length - 1 && (
              <div className="mx-5" style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />
            )}
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="my-5 mx-5" style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

      {/* Creator Corner Posts */}
      <div className="px-5 pb-6">
        <span className="text-section-label">Creator Corner Posts</span>

        {/* Post 1 — Sophie Chen */}
        <div
          className="mt-3 rounded-card p-[14px]"
          style={{ background: "#2a2a2a", border: "1px solid rgba(228,220,209,0.08)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center flex-none" style={{ background: "#e4dcd1" }}>
              <span className="font-montserrat font-semibold" style={{ fontSize: "11px", color: "#222222" }}>SC</span>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-montserrat font-semibold text-white" style={{ fontSize: "12px" }}>Sophie Chen</span>
              <PillTag label="Creator" />
            </div>
            <span className="font-montserrat flex-none" style={{ fontSize: "10px", color: "#706b6b" }}>3h ago</span>
          </div>

          <p className="font-montserrat font-normal leading-[1.6] mb-3" style={{ fontSize: "12px", color: "#c8c3bc" }}>
            Just wrapped an incredible Boots UK shoot — the team was amazing and I&apos;m obsessed with the content we created. Can&apos;t wait to share! ✨
          </p>

          <div className="flex items-center gap-4">
            <button onClick={() => setLiked1(!liked1)} className="flex items-center gap-1.5">
              <Heart size={14} fill={liked1 ? "#e4dcd1" : "none"} color={liked1 ? "#e4dcd1" : "#706b6b"} />
              <span className="font-montserrat" style={{ fontSize: "10px", color: "#706b6b" }}>22</span>
            </button>
            <button className="flex items-center gap-1.5">
              <MessageCircle size={14} color="#706b6b" />
              <span className="font-montserrat" style={{ fontSize: "10px", color: "#706b6b" }}>8</span>
            </button>
            <button onClick={() => setBookmarked1(!bookmarked1)} className="ml-auto">
              <Bookmark size={14} fill={bookmarked1 ? "#e4dcd1" : "none"} color={bookmarked1 ? "#e4dcd1" : "#706b6b"} />
            </button>
          </div>
        </div>

        {/* Post 2 — Maya Patel (with image) */}
        <div
          className="mt-3 rounded-card p-[14px]"
          style={{ background: "#2a2a2a", border: "1px solid rgba(228,220,209,0.08)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center flex-none" style={{ background: "#9b7e56" }}>
              <span className="font-montserrat font-semibold" style={{ fontSize: "11px", color: "#ffffff" }}>MP</span>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-montserrat font-semibold text-white" style={{ fontSize: "12px" }}>Maya Patel</span>
              <PillTag label="Creator" />
            </div>
            <span className="font-montserrat flex-none" style={{ fontSize: "10px", color: "#706b6b" }}>5h ago</span>
          </div>

          <p className="font-montserrat font-normal leading-[1.6]" style={{ fontSize: "12px", color: "#c8c3bc", marginBottom: "10px" }}>
            Just posted my first paid collab and honestly could not be happier with how it turned out! The brand were so easy to work with. Has anyone else been working with Kaleidos? 🎨
          </p>

          {/* Post image placeholder */}
          <div
            style={{
              width: "100%",
              height: "160px",
              borderRadius: "8px",
              background: "#3d3550",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <Image size={24} color="#706b6b" strokeWidth={1.5} />
            <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b" }}>[Image]</span>
          </div>

          {/* Actions */}
          <div
            className="flex items-center gap-4"
            style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <button onClick={() => setLiked2(!liked2)} className="flex items-center gap-1.5">
              <Heart size={14} fill={liked2 ? "#e4dcd1" : "none"} color={liked2 ? "#e4dcd1" : "#706b6b"} />
              <span className="font-montserrat" style={{ fontSize: "10px", color: "#706b6b" }}>18</span>
            </button>
            <button className="flex items-center gap-1.5">
              <MessageCircle size={14} color="#706b6b" />
              <span className="font-montserrat" style={{ fontSize: "10px", color: "#706b6b" }}>4</span>
            </button>
            <button onClick={() => setBookmarked2(!bookmarked2)} className="ml-auto">
              <Bookmark size={14} fill={bookmarked2 ? "#e4dcd1" : "none"} color={bookmarked2 ? "#e4dcd1" : "#706b6b"} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
