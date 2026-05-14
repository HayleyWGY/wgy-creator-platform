"use client";

import { useState } from "react";
import { Search, Flag, Mail, Archive, Send } from "lucide-react";

const THREADS = [
  { name: "Laura Edwards",    initials: "LE", preview: "Has anyone received the Boots package yet?",       time: "2m ago", unread: true,  flagged: false },
  { name: "Sophie Chen",      initials: "SC", preview: "Just wanted to say thank you so much!",            time: "1h ago", unread: true,  flagged: true  },
  { name: "Maya Patel",       initials: "MP", preview: "Hi! Quick question about the deliverables",        time: "2h ago", unread: true,  flagged: false },
  { name: "Charlotte Hamilton",initials: "CH",preview: "This app seems very quiet at the moment?",         time: "3h ago", unread: false, flagged: false },
  { name: "Hanna Dixon",      initials: "HD", preview: "Hey new to the app, how is everyone?",             time: "5h ago", unread: false, flagged: false },
  { name: "Samantha Johnson", initials: "SJ", preview: "I got confirmed for the campaign!",                time: "1d ago", unread: false, flagged: true  },
  { name: "Libbie Thomas",    initials: "LT", preview: "Applied for the FW Beauty one, fingers crossed",   time: "1d ago", unread: false, flagged: false },
];

type FilterTab = "all" | "unread" | "flagged";

function Avatar({ initials, size = 40 }: { initials: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#e4dcd1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        className="font-montserrat font-bold"
        style={{ fontSize: size * 0.325, color: "#222222" }}
      >
        {initials}
      </span>
    </div>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "8px 0" }}>
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
      <span className="font-montserrat font-normal" style={{ fontSize: "10px", color: "#706b6b" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

export default function InboxPage() {
  const [activeThread, setActiveThread] = useState("Laura Edwards");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const [flaggedThreads, setFlaggedThreads] = useState<Set<string>>(
    new Set(THREADS.filter((t) => t.flagged).map((t) => t.name))
  );

  function toggleFlag(name: string) {
    setFlaggedThreads((prev) => {
      const s = new Set(prev);
      if (s.has(name)) { s.delete(name); } else { s.add(name); }
      return s;
    });
  }

  const filtered = THREADS.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTab === "unread") return t.unread;
    if (filterTab === "flagged") return flaggedThreads.has(t.name);
    return true;
  });

  const unreadCount = THREADS.filter((t) => t.unread).length;
  const activeIsFlagged = flaggedThreads.has(activeThread);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "flagged", label: "Flagged" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          padding: "32px 32px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexShrink: 0,
        }}
      >
        <div>
          <p
            className="font-montserrat font-bold uppercase"
            style={{ fontSize: "10px", letterSpacing: "0.12em", color: "#706b6b" }}
          >
            Inbox
          </p>
          <h1
            className="font-playfair italic font-normal text-white"
            style={{ fontSize: "32px", marginTop: "4px" }}
          >
            Creator Messages
          </h1>
        </div>
        <span
          className="font-montserrat font-semibold"
          style={{ fontSize: "13px", color: "#e4dcd1", paddingBottom: "6px" }}
        >
          {unreadCount} unread
        </span>
      </div>

      {/* Two-column layout */}
      <div
        style={{
          padding: "24px 32px 32px",
          display: "grid",
          gridTemplateColumns: "380px 1fr",
          gap: 0,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* LEFT — Thread list */}
        <div
          style={{
            background: "#2a2a2a",
            borderRadius: "12px 0 0 12px",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Search bar */}
          <div
            style={{
              padding: "16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}
          >
            <div style={{ position: "relative" }}>
              <Search
                size={14}
                color="#706b6b"
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search messages..."
                className="font-montserrat font-normal"
                style={{
                  width: "100%",
                  height: "40px",
                  background: "#333333",
                  border: "none",
                  borderRadius: "8px",
                  paddingLeft: "32px",
                  paddingRight: "12px",
                  color: "#ffffff",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div
            style={{
              padding: "8px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              gap: "16px",
              flexShrink: 0,
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={filterTab === tab.key ? "font-montserrat font-semibold" : "font-montserrat font-normal"}
                style={{
                  fontSize: "11px",
                  color: filterTab === tab.key ? "#e4dcd1" : "#706b6b",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 0",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Thread list */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.map((thread) => {
              const isActive = thread.name === activeThread;
              const isFlagged = flaggedThreads.has(thread.name);
              return (
                <div
                  key={thread.name}
                  onClick={() => setActiveThread(thread.name)}
                  style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    cursor: "pointer",
                    background: isActive
                      ? "rgba(228,220,209,0.08)"
                      : thread.unread
                      ? "rgba(228,220,209,0.04)"
                      : "transparent",
                    borderLeft: thread.unread && !isActive
                      ? "3px solid #e4dcd1"
                      : isActive
                      ? "3px solid #e4dcd1"
                      : "3px solid transparent",
                  }}
                >
                  <div style={{ display: "flex", gap: "10px" }}>
                    <Avatar initials={thread.initials} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Top row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span
                          className="font-montserrat font-semibold"
                          style={{ fontSize: "13px", color: "#ffffff" }}
                        >
                          {thread.name}
                        </span>
                        <span
                          className="font-montserrat font-normal"
                          style={{ fontSize: "10px", color: "#706b6b", flexShrink: 0, marginLeft: "8px" }}
                        >
                          {thread.time}
                        </span>
                      </div>
                      {/* Preview */}
                      <p
                        className="font-montserrat font-normal"
                        style={{
                          fontSize: "12px",
                          color: "#706b6b",
                          marginTop: "2px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {thread.preview}
                      </p>
                      {/* Badges */}
                      {(isFlagged || thread.unread) && (
                        <div style={{ marginTop: "4px", display: "flex", gap: "6px", alignItems: "center" }}>
                          {isFlagged && <Flag size={12} color="#e4dcd1" strokeWidth={1.5} />}
                          {thread.unread && (
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#e4dcd1" }} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Conversation */}
        <div
          style={{
            background: "#222222",
            borderRadius: "0 12px 12px 0",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Conversation header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "#2a2a2a",
              borderRadius: "0 12px 0 0",
              flexShrink: 0,
            }}
          >
            <Avatar initials="LE" size={40} />
            <div style={{ flex: 1 }}>
              <p className="font-montserrat font-semibold" style={{ fontSize: "14px", color: "#ffffff" }}>
                Laura Edwards
              </p>
              <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b", marginTop: "1px" }}>
                Active 2 minutes ago
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={() => toggleFlag("Laura Edwards")}
                title="Flag conversation"
                style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex" }}
              >
                <Flag size={16} color={activeIsFlagged ? "#e4dcd1" : "#706b6b"} strokeWidth={1.5} />
              </button>
              <button
                title="Mark as unread"
                style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex" }}
              >
                <Mail size={16} color="#706b6b" strokeWidth={1.5} />
              </button>
              <button
                title="Archive"
                style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex" }}
              >
                <Archive size={16} color="#706b6b" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <DateSeparator label="May 6" />

            {/* Laura message */}
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <Avatar initials="LE" size={28} />
              <div>
                <div
                  style={{
                    background: "#2a2a2a",
                    borderRadius: "0 12px 12px 12px",
                    padding: "10px 14px",
                    maxWidth: "70%",
                  }}
                >
                  <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "#ffffff", lineHeight: 1.5 }}>
                    Has anyone received the Boots package yet? WGY got in touch to say I would receive it week of 27th April but not got anything yet
                  </p>
                </div>
                <p className="font-montserrat font-normal" style={{ fontSize: "10px", color: "#706b6b", marginTop: "4px", marginLeft: "2px" }}>
                  10:00 PM
                </p>
              </div>
            </div>

            <DateSeparator label="Today" />

            {/* WGY reply */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <p className="font-montserrat font-normal" style={{ fontSize: "10px", color: "#e4dcd1", marginBottom: "4px" }}>
                WGY LTD
              </p>
              <div
                style={{
                  background: "#9b7e56",
                  borderRadius: "12px 0 12px 12px",
                  padding: "10px 14px",
                  maxWidth: "70%",
                }}
              >
                <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "#ffffff", lineHeight: 1.5 }}>
                  Hey Laura! So sorry for the delay. I have chased this with Boots today and they have confirmed your package was dispatched on May 8th. You should receive it within the next 2-3 working days! Let us know when it arrives 📦
                </p>
              </div>
              <p className="font-montserrat font-normal" style={{ fontSize: "10px", color: "#706b6b", marginTop: "4px" }}>
                9:00 AM
              </p>
            </div>

            {/* Laura reply */}
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <Avatar initials="LE" size={28} />
              <div>
                <div
                  style={{
                    background: "#2a2a2a",
                    borderRadius: "0 12px 12px 12px",
                    padding: "10px 14px",
                    maxWidth: "70%",
                  }}
                >
                  <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "#ffffff", lineHeight: 1.5 }}>
                    Amazing thank you so much for chasing that! Will let you know when it arrives 😊
                  </p>
                </div>
                <p className="font-montserrat font-normal" style={{ fontSize: "10px", color: "#706b6b", marginTop: "4px", marginLeft: "2px" }}>
                  9:15 AM
                </p>
              </div>
            </div>
          </div>

          {/* Reply bar */}
          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "#2a2a2a",
              borderRadius: "0 0 12px 0",
              flexShrink: 0,
            }}
          >
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply to Laura..."
              className="font-montserrat font-normal"
              style={{
                width: "100%",
                minHeight: "80px",
                background: "#333333",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                padding: "12px",
                color: "#ffffff",
                fontSize: "13px",
                outline: "none",
                resize: "none",
                caretColor: "#e4dcd1",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#e4dcd1")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "8px",
              }}
            >
              <span className="font-montserrat font-normal" style={{ fontSize: "10px", color: "#706b6b" }}>
                Press Enter to send, Shift+Enter for new line
              </span>
              <button
                onClick={() => setReplyText("")}
                className="font-montserrat font-semibold"
                style={{
                  background: "#e4dcd1",
                  color: "#222222",
                  fontSize: "12px",
                  padding: "8px 20px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Send size={14} strokeWidth={1.5} />
                Send Reply
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`input::placeholder { color: #706b6b; } textarea::placeholder { color: #706b6b; }`}</style>
    </div>
  );
}
