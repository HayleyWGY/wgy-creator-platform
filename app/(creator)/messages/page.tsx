"use client";

import { Search, PenSquare, Lock } from "lucide-react";
import Link from "next/link";

const THREADS = [
  {
    id: "wgy-main",
    name: "WGY LTD",
    initials: "WG",
    online: true,
    preview: "Hey! We are hosting a WGY x Sculpted...",
    time: "3 weeks ago",
    unread: 1,
  },
  {
    id: "wgy-welcome",
    name: "WGY LTD",
    initials: "WG",
    online: false,
    preview: "Welcome to WGY! Here is how to get...",
    time: "2 months ago",
    unread: 0,
  },
];

export default function MessagesPage() {
  return (
    <div>
      {/* Header */}
      <div
        className="px-5 pt-6 pb-4 flex items-center justify-between"
      >
        <h1 className="text-page-heading text-white">
          Messages
        </h1>
        <PenSquare size={20} color="#e4dcd1" strokeWidth={1.5} />
      </div>

      {/* Search */}
      <div className="relative flex items-center mx-5 mb-4" style={{ height: "44px" }}>
        <Search
          size={15}
          color="#706b6b"
          className="absolute left-3"
          style={{ pointerEvents: "none" }}
        />
        <input
          type="text"
          placeholder="Search messages..."
          className="w-full h-full font-montserrat font-normal outline-none"
          style={{
            background: "#2a2a2a",
            borderRadius: "8px",
            paddingLeft: "36px",
            paddingRight: "16px",
            fontSize: "13px",
            color: "#ffffff",
            caretColor: "#e4dcd1",
          }}
        />
        <style>{`input::placeholder { color: #706b6b; }`}</style>
      </div>

      {/* Thread list */}
      <div>
        {THREADS.map((thread) => (
          <Link
            key={thread.id}
            href={`/messages/${thread.id}`}
            className="flex gap-3 px-5 py-[14px] no-underline"
            style={{
              background: "#222222",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              textDecoration: "none",
            }}
          >
            {/* Avatar */}
            <div className="relative flex-none">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: "#e4dcd1" }}
              >
                <span
                  className="font-montserrat font-bold"
                  style={{ fontSize: "14px", color: "#222222" }}
                >
                  {thread.initials}
                </span>
              </div>
              {thread.online && (
                <span
                  className="absolute bottom-0 right-0 w-3 h-3 rounded-full"
                  style={{ background: "#27AE60", border: "2px solid #222222" }}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className="font-montserrat font-semibold text-white"
                style={{ fontSize: "13px" }}
              >
                {thread.name}
              </p>
              <p
                className="font-montserrat font-normal mt-[2px] truncate"
                style={{ fontSize: "12px", color: "#706b6b" }}
              >
                {thread.preview}
              </p>
            </div>

            {/* Right */}
            <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
              <span
                className="font-montserrat font-normal"
                style={{ fontSize: "10px", color: "#706b6b" }}
              >
                {thread.time}
              </span>
              {thread.unread > 0 && (
                <div
                  className="flex items-center justify-center"
                  style={{
                    minWidth: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#e4dcd1",
                    padding: "0 4px",
                  }}
                >
                  <span
                    className="font-montserrat font-bold"
                    style={{ fontSize: "9px", color: "#222222" }}
                  >
                    {thread.unread}
                  </span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Footer note */}
      <div className="flex items-center justify-center gap-1.5 px-5 pt-5">
        <Lock size={12} color="#706b6b" strokeWidth={1.5} />
        <p
          className="font-montserrat font-normal"
          style={{ fontSize: "11px", color: "#706b6b" }}
        >
          Messages are between you and WGY only
        </p>
      </div>
    </div>
  );
}
