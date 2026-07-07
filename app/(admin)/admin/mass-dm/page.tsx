"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

interface Segment {
  key: string;
  label: string;
  count: number;
}

export default function MassDmPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selected, setSelected] = useState<string>("all_active");
  const [message, setMessage]   = useState("");
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [result, setResult]     = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/mass-dm")
      .then(r => r.json())
      .then(d => { if (d.segments) setSegments(d.segments); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedSeg = segments.find(s => s.key === selected);
  const recipientCount = selectedSeg?.count ?? 0;
  const canSend = !!message.trim() && recipientCount > 0 && !sending;

  async function send() {
    if (!canSend || !selectedSeg) return;
    if (!confirm(`Send this DM to ${recipientCount} creator${recipientCount === 1 ? "" : "s"} — "${selectedSeg.label}"?`)) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/mass-dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment: selected, body: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, text: data.error || "Could not send." });
      } else {
        setResult({ ok: true, text: `Sent to ${data.sent} creator${data.sent === 1 ? "" : "s"}.` });
        setMessage("");
      }
    } catch {
      setResult({ ok: false, text: "Network error — please try again." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "32px 32px 24px" }}>
        <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--text-muted)" }}>
          Mass DM
        </p>
        <h1 className="admin-title" style={{ fontSize: "32px", marginTop: "4px" }}>Message an Audience</h1>
        <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px", maxWidth: "560px", lineHeight: 1.5 }}>
          Send a direct message from WGY to a group of creators at once. It lands in each creator&apos;s WGY chat. To message a specific tag instead, use the tag&apos;s page under Tags.
        </p>
      </div>

      <div style={{ padding: "0 32px 40px", maxWidth: "640px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Audience */}
        <div style={{ background: "var(--surface)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)", padding: "20px" }}>
          <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--accent)", marginBottom: "12px" }}>
            Audience
          </p>
          {loading ? (
            <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading audiences…</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {segments.map(seg => {
                const active = selected === seg.key;
                return (
                  <button
                    key={seg.key}
                    onClick={() => setSelected(seg.key)}
                    className="font-montserrat"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 14px", borderRadius: "8px", cursor: "pointer", textAlign: "left",
                      background: active ? "rgba(228,220,209,0.1)" : "var(--surface-2)",
                      border: active ? "1px solid var(--accent)" : "1px solid rgba(255,255,255,0.06)",
                      color: "var(--text)",
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: active ? 700 : 500 }}>{seg.label}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "var(--text-muted)", flexShrink: 0 }}>
                      <Users size={12} /> {seg.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Message */}
        <div style={{ background: "var(--surface)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)", padding: "20px" }}>
          <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--accent)", marginBottom: "12px" }}>
            Message
          </p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Write your message…"
            rows={5}
            className="font-montserrat font-normal"
            style={{ width: "100%", background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "12px 14px", color: "var(--text)", fontSize: "13px", outline: "none", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }}
          />
          {result && (
            <p className="font-montserrat font-medium" style={{ fontSize: "12px", color: result.ok ? "#27AE60" : "#F97066", marginTop: "12px" }}>
              {result.text}
            </p>
          )}
          <button
            onClick={send}
            disabled={!canSend}
            className="font-montserrat font-semibold"
            style={{ marginTop: "14px", height: "42px", padding: "0 20px", background: canSend ? "var(--accent)" : "var(--surface-2)", color: canSend ? "var(--bg)" : "var(--text-muted)", fontSize: "12px", border: "none", borderRadius: "8px", cursor: canSend ? "pointer" : "not-allowed" }}
          >
            {sending ? "Sending…" : `Send to ${recipientCount} creator${recipientCount === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>

      <style>{`textarea::placeholder { color: var(--text-muted); }`}</style>
    </div>
  );
}
