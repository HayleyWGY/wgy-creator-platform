"use client";

// TODO Phase 1B Part 2: Replace static messages
// with Stream Chat real-time integration
// Required env vars:
// NEXT_PUBLIC_STREAM_API_KEY=
// STREAM_API_SECRET=
// See getstream.io for setup guide

import { ArrowLeft, MoreHorizontal, Send, Mic } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

const MESSAGES = [
  {
    id: 1,
    sender: "wgy",
    text: "Hey! 💌 We're hosting a WGY x Sculpted by Aimee event on April 23rd. We'd love for you to join us! Spots are limited so let us know ASAP if you're interested.",
    time: "3 weeks ago",
    dateSeparator: "3 weeks ago",
  },
  {
    id: 2,
    sender: "creator",
    text: "This sounds amazing! I would love to come, count me in!",
    time: "3 weeks ago",
    dateSeparator: null,
  },
  {
    id: 3,
    sender: "wgy",
    text: "Amazing! We will send you the details shortly. So excited to see you there 🎉",
    time: "3 weeks ago",
    dateSeparator: null,
  },
  {
    id: 4,
    sender: "wgy",
    text: "Hey Hayley! Just checking in — have you had a chance to look at the FW Beauty campaign? We think it would be a great fit for you!",
    time: "Just now",
    dateSeparator: "Today",
  },
];

export default function DMThreadPage() {
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col" style={{ minHeight: "100%", paddingBottom: "140px" }}>
      {/* Thread header — overrides layout header visually via z-index */}
      <div
        className="sticky top-0 z-40 flex items-center gap-3 px-5"
        style={{
          background: "#1c1c1c",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          height: "56px",
        }}
      >
        <Link href="/messages" className="flex-none">
          <ArrowLeft size={18} color="#706b6b" strokeWidth={1.5} />
        </Link>

        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-none"
          style={{ background: "#e4dcd1" }}
        >
          <span
            className="font-montserrat font-bold"
            style={{ fontSize: "12px", color: "#222222" }}
          >
            WG
          </span>
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p
            className="font-montserrat font-semibold text-white"
            style={{ fontSize: "13px" }}
          >
            WGY LTD
          </p>
          <p
            className="font-montserrat font-normal"
            style={{ fontSize: "10px", color: "#27AE60" }}
          >
            Online
          </p>
        </div>

        <MoreHorizontal size={20} color="#706b6b" strokeWidth={1.5} />
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-4 px-5 pt-5">
        {MESSAGES.map((msg) => (
          <div key={msg.id}>
            {/* Date separator */}
            {msg.dateSeparator && (
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1" style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />
                <span
                  className="font-montserrat font-normal flex-none"
                  style={{ fontSize: "10px", color: "#706b6b" }}
                >
                  {msg.dateSeparator}
                </span>
                <div className="flex-1" style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />
              </div>
            )}

            {msg.sender === "wgy" ? (
              /* WGY message — left aligned */
              <div className="flex items-end gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-none"
                  style={{ background: "#e4dcd1" }}
                >
                  <span
                    className="font-montserrat font-bold"
                    style={{ fontSize: "8px", color: "#222222" }}
                  >
                    WG
                  </span>
                </div>
                <div>
                  <div
                    className="font-montserrat font-normal text-white"
                    style={{
                      background: "#2a2a2a",
                      borderRadius: "0 12px 12px 12px",
                      padding: "10px 14px",
                      maxWidth: "75%",
                      fontSize: "13px",
                      lineHeight: 1.5,
                    }}
                  >
                    {msg.text}
                  </div>
                  <p
                    className="font-montserrat font-normal mt-1"
                    style={{ fontSize: "10px", color: "#706b6b" }}
                  >
                    {msg.time}
                  </p>
                </div>
              </div>
            ) : (
              /* Creator message — right aligned */
              <div className="flex flex-col items-end">
                <div
                  className="font-montserrat font-normal text-white"
                  style={{
                    background: "#9b7e56",
                    borderRadius: "12px 0 12px 12px",
                    padding: "10px 14px",
                    maxWidth: "75%",
                    fontSize: "13px",
                    lineHeight: 1.5,
                  }}
                >
                  {msg.text}
                </div>
                <p
                  className="font-montserrat font-normal mt-1"
                  style={{ fontSize: "10px", color: "#706b6b", textAlign: "right" }}
                >
                  {msg.time}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input bar — sticky above bottom nav */}
      <div
        className="fixed z-40 flex items-center gap-3 px-5 py-3"
        style={{
          bottom: "80px",
          background: "#1c1c1c",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          width: "100%",
          maxWidth: "390px",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-none"
          style={{ background: "#e4dcd1" }}
        >
          <span
            className="font-montserrat font-semibold"
            style={{ fontSize: "9px", color: "#222222" }}
          >
            HW
          </span>
        </div>

        <div
          className="flex-1 flex items-center gap-2 px-4 py-[10px] rounded-pill"
          style={{ background: "#2a2a2a" }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Write something..."
            className="flex-1 bg-transparent outline-none font-montserrat font-normal"
            style={{ fontSize: "13px", color: "#ffffff" }}
          />
          {!input && <Mic size={14} color="#706b6b" />}
        </div>

        {input.trim() && (
          <button
            className="flex items-center justify-center flex-none"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "#e4dcd1",
            }}
          >
            <Send size={14} color="#222222" />
          </button>
        )}

        <style>{`input::placeholder { color: #706b6b; }`}</style>
      </div>
    </div>
  );
}
