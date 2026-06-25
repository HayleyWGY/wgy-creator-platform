"use client";

import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";

// TODO Phase 3: Replace with DB query — all tags for recipient selection
const ALL_TAGS = [
  "Boots May 2026",
  "PERL",
  "Nature Spell",
  "Kaleidos",
  "VitD",
  "Boots Apr 2026",
];

// TODO Phase 3: Replace with DB query — sent DM history
const DM_HISTORY = [
  {
    tags: ["PERL"],
    message: "Hey {firstName}! Just a reminder that the Boots campaign...",
    count: 89,
    time: "2 days ago",
  },
  {
    tags: ["Boots May 2026"],
    message: "Hi {firstName}! Your Boots package should be arriving this week...",
    count: 47,
    time: "1 week ago",
  },
  {
    tags: ["VitD", "PERL"],
    message: "Hey {firstName}! We have an exciting new...",
    count: 201,
    time: "2 weeks ago",
  },
];

// TODO Phase 3: Replace with real creator count per tag from DB
const TAG_COUNTS: Record<string, number> = {
  "Boots May 2026": 47,
  "PERL":           89,
  "Nature Spell":   23,
  "Kaleidos":       34,
  "VitD":           156,
  "Boots Apr 2026": 41,
};

const MAX_CHARS = 500;

export default function MassDMPage() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [message, setMessage]           = useState("");
  const [sent, setSent]                 = useState(false);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  const recipientCount = selectedTags.reduce(
    (sum, tag) => sum + (TAG_COUNTS[tag] ?? 0),
    0
  );

  const charsLeft    = MAX_CHARS - message.length;
  const isDisabled   = selectedTags.length === 0 || message.trim() === "";

  function handleSend() {
    if (isDisabled) return;
    setSent(true);
  }

  function handleReset() {
    setSent(false);
    setSelectedTags([]);
    setMessage("");
  }

  if (sent) {
    return (
      <div>
        <div style={{ padding: "32px 32px 24px" }}>
          <p
            className="font-montserrat font-bold uppercase"
            style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--text-muted)" }}
          >
            Mass DM
          </p>
          <h1
            className="font-playfair italic font-normal text-white"
            style={{ fontSize: "32px", marginTop: "4px" }}
          >
            Send Mass DM
          </h1>
        </div>

        <div style={{ padding: "0 32px 32px", display: "flex", justifyContent: "center" }}>
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "12px",
              padding: "48px 32px",
              textAlign: "center",
              maxWidth: "480px",
              width: "100%",
            }}
          >
            <CheckCircle size={64} color="#27AE60" strokeWidth={1.5} style={{ margin: "0 auto" }} />
            <h2
              className="font-playfair italic font-normal text-white"
              style={{ fontSize: "24px", marginTop: "20px" }}
            >
              Message Sent!
            </h2>
            <p
              className="font-montserrat font-normal"
              style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px", lineHeight: 1.6 }}
            >
              Your message has been sent to{" "}
              <span style={{ color: "var(--accent)" }}>{recipientCount.toLocaleString()}</span> creators successfully.
            </p>
            <button
              onClick={handleReset}
              className="font-montserrat font-semibold"
              style={{ fontSize: "13px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", marginTop: "24px" }}
            >
              Send Another Message
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "32px 32px 24px" }}>
        <p
          className="font-montserrat font-bold uppercase"
          style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--text-muted)" }}
        >
          Mass DM
        </p>
        <h1
          className="font-playfair italic font-normal text-white"
          style={{ fontSize: "32px", marginTop: "4px" }}
        >
          Send Mass DM
        </h1>
      </div>

      {/* Two column */}
      <div
        style={{
          padding: "0 32px 32px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
        }}
      >
        {/* LEFT — Compose */}
        <div style={{ background: "var(--surface)", borderRadius: "12px", padding: "24px" }}>
          <span className="text-section-label">Select Recipients</span>

          {/* Tag selector */}
          <div style={{ marginTop: "12px" }}>
            <p
              className="font-montserrat font-normal uppercase"
              style={{ fontSize: "11px", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "10px" }}
            >
              Send to creators tagged with:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {ALL_TAGS.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="font-montserrat font-semibold uppercase"
                    style={{
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      padding: "5px 12px",
                      borderRadius: "20px",
                      border: "none",
                      cursor: "pointer",
                      background: selected ? "var(--accent)" : "var(--surface-2)",
                      color: selected ? "var(--bg)" : "var(--text-muted)",
                      transition: "background 0.15s, color 0.15s",
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient count */}
          <p
            className="font-montserrat font-semibold"
            style={{ fontSize: "13px", color: "var(--accent)", marginTop: "16px" }}
          >
            {selectedTags.length === 0
              ? "Select tags above"
              : `${recipientCount.toLocaleString()} creator${recipientCount !== 1 ? "s" : ""} will receive this message`}
          </p>

          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "20px 0" }} />

          <span className="text-section-label">Compose Message</span>
          <p
            className="font-montserrat font-normal"
            style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}
          >
            Keep messages concise. Creators receive these as DMs in the app.
          </p>

          {/* Textarea */}
          <div style={{ position: "relative", marginTop: "12px" }}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
              placeholder={"Write your message...\nYou can use {firstName} to personalise it."}
              className="font-montserrat font-normal"
              style={{
                width: "100%",
                minHeight: "120px",
                background: "var(--surface-2)",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "14px",
                paddingBottom: "32px",
                color: "var(--text)",
                fontSize: "13px",
                outline: "none",
                resize: "vertical",
                caretColor: "var(--accent)",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
            />
            <span
              className="font-montserrat font-normal"
              style={{
                position: "absolute",
                bottom: "10px",
                right: "12px",
                fontSize: "10px",
                color: charsLeft < 50 ? "#C0392B" : "var(--text-muted)",
                pointerEvents: "none",
                fontWeight: charsLeft < 50 ? 600 : 400,
              }}
            >
              {charsLeft} remaining
            </span>
          </div>

          {/* Preview */}
          <div
            style={{
              marginTop: "12px",
              background: "var(--surface-2)",
              borderRadius: "8px",
              padding: "12px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span className="font-montserrat font-bold" style={{ fontSize: "8px", color: "var(--bg)" }}>WG</span>
            </div>
            <div>
              <p className="font-montserrat font-semibold" style={{ fontSize: "11px", color: "var(--text)" }}>WGY LTD</p>
              <p
                className="font-montserrat font-normal"
                style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic", marginTop: "2px" }}
              >
                {message
                  ? `Hey Sophie, ${message.replace(/\{firstName\}/g, "Sophie").slice(0, 60)}${message.length > 60 ? "..." : ""}`
                  : "Your message will appear here..."}
              </p>
            </div>
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={isDisabled}
            className="font-montserrat font-semibold"
            style={{
              width: "100%",
              height: "48px",
              borderRadius: "8px",
              background: "var(--accent)",
              color: "var(--bg)",
              fontSize: "13px",
              border: "none",
              cursor: isDisabled ? "not-allowed" : "pointer",
              marginTop: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              opacity: isDisabled ? 0.5 : 1,
              transition: "opacity 0.15s",
            }}
          >
            <Send size={16} strokeWidth={1.5} />
            {selectedTags.length === 0
              ? "Select recipients to send"
              : `Send to ${recipientCount.toLocaleString()} Creator${recipientCount !== 1 ? "s" : ""}`}
          </button>
        </div>

        {/* RIGHT — History */}
        <div style={{ background: "var(--surface)", borderRadius: "12px", padding: "24px" }}>
          <span className="text-section-label">Sent Messages</span>

          <div style={{ marginTop: "8px" }}>
            {DM_HISTORY.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "14px 0",
                  borderBottom: i < DM_HISTORY.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-montserrat font-semibold uppercase"
                      style={{ fontSize: "9px", letterSpacing: "0.08em", background: "var(--surface-2)", color: "var(--accent)", padding: "3px 8px", borderRadius: "20px" }}
                    >
                      {tag}
                    </span>
                  ))}
                  <span
                    className="font-montserrat font-normal"
                    style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "auto" }}
                  >
                    {item.time}
                  </span>
                </div>
                <p
                  className="font-montserrat font-normal"
                  style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {item.message}
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                  <p className="font-montserrat font-normal" style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    Sent to {item.count} creators
                  </p>
                  <CheckCircle size={14} color="#27AE60" strokeWidth={1.5} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`textarea::placeholder { color: var(--text-muted); }`}</style>
    </div>
  );
}
