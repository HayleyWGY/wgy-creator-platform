"use client";

import { useState } from "react";
import { ChevronDown, PenLine, Trash2, X } from "lucide-react";

// TODO Phase 3: Replace with DB query — sequences + message templates
type Message = { id: number; dayOffset: number; subject: string; body: string; active: boolean };
type Sequence = { id: string; name: string; active: boolean; messages: Message[] };

const INITIAL_SEQUENCES: Sequence[] = [
  {
    id: "onboarding",
    name: "Onboarding",
    active: true,
    messages: [
      { id: 1, dayOffset: 0,  subject: "Welcome Message",      active: true,  body: "Hey {firstName}! 👋 Welcome to WGY! We are so excited to have you here. Head to the Opportunities section to see what brand campaigns are live right now." },
      { id: 2, dayOffset: 2,  subject: "First Opportunities",  active: true,  body: "Hey {firstName}! Just checking in — have you had a chance to browse the Opportunities section yet?" },
      { id: 3, dayOffset: 5,  subject: "Community Introduction", active: true, body: "Hi {firstName}! Have you joined the community chat yet? Head to the Community tab and introduce yourself in Group Chat." },
      { id: 4, dayOffset: 10, subject: "Campaign Tips",         active: true,  body: "Hey {firstName}! Here are our top tips for getting selected for campaigns: Complete your profile fully and engage with posts by liking and commenting." },
      { id: 5, dayOffset: 30, subject: "One Month Check-in",    active: false, body: "Hi {firstName}! You have been part of WGY for a whole month! We would love to hear how you are finding it." },
    ],
  },
  {
    id: "checkin",
    name: "Check-in",
    active: false,
    messages: [
      { id: 6, dayOffset: 0, subject: "Check-in Message", active: false, body: "Hi {firstName}! Just checking in to see how things are going." },
    ],
  },
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{ width: 36, height: 20, borderRadius: 10, background: on ? "#27AE60" : "var(--text-muted)", border: "none", cursor: "pointer", position: "relative", flexShrink: 0 }}
    >
      <div style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "var(--text)", transition: "left 0.15s" }} />
    </button>
  );
}

type EditState = { seqId: string; msg: Message };

function EditModal({ state, onSave, onClose }: { state: EditState; onSave: (seqId: string, msg: Message) => void; onClose: () => void }) {
  const [form, setForm] = useState<Message>({ ...state.msg });
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--surface)", borderRadius: "12px", padding: "24px", width: "480px", maxWidth: "90vw" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--accent)" }}>Edit Message</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}><X size={16} color="var(--text-muted)" strokeWidth={1.5} /></button>
        </div>

        <label className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.10em", color: "var(--text-muted)" }}>Day Offset</label>
        <input type="number" value={form.dayOffset} onChange={(e) => setForm({ ...form, dayOffset: Number(e.target.value) })}
          className="font-montserrat font-normal"
          style={{ display: "block", width: "100px", height: "40px", background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "0 12px", color: "var(--text)", fontSize: "13px", outline: "none", marginTop: "6px", marginBottom: "14px" }} />

        <label className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.10em", color: "var(--text-muted)" }}>Subject</label>
        <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="font-montserrat font-normal"
          style={{ display: "block", width: "100%", height: "40px", background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "0 12px", color: "var(--text)", fontSize: "13px", outline: "none", marginTop: "6px", marginBottom: "14px", boxSizing: "border-box" }} />

        <label className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.10em", color: "var(--text-muted)" }}>Message Body</label>
        <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
          className="font-montserrat font-normal"
          style={{ display: "block", width: "100%", minHeight: "120px", background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "12px", color: "var(--text)", fontSize: "13px", outline: "none", resize: "none", marginTop: "6px", boxSizing: "border-box" }} />
        <p className="font-montserrat font-normal" style={{ fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic", marginTop: "4px" }}>
          {"{firstName}"} will be replaced with the creator&apos;s first name automatically
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "14px" }}>
          <Toggle on={form.active} onChange={() => setForm({ ...form, active: !form.active })} />
          <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{form.active ? "Active" : "Inactive"}</span>
        </div>

        <button onClick={() => { onSave(state.seqId, form); onClose(); }}
          className="font-montserrat font-semibold"
          style={{ width: "100%", height: "44px", background: "var(--accent)", color: "var(--bg)", fontSize: "13px", border: "none", borderRadius: "8px", cursor: "pointer", marginTop: "20px" }}>
          Save Changes
        </button>
        <div style={{ textAlign: "center", marginTop: "10px" }}>
          <button onClick={onClose} className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
      <style>{`input::placeholder, textarea::placeholder { color: var(--text-muted); }`}</style>
    </div>
  );
}

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>(INITIAL_SEQUENCES);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["onboarding"]));
  const [editing, setEditing] = useState<EditState | null>(null);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const s = new Set(prev);
      if (s.has(id)) { s.delete(id); } else { s.add(id); }
      return s;
    });
  }

  function saveMessage(seqId: string, updated: Message) {
    setSequences((prev) =>
      prev.map((seq) =>
        seq.id === seqId
          ? { ...seq, messages: seq.messages.map((m) => (m.id === updated.id ? updated : m)) }
          : seq
      )
    );
  }

  function toggleMsgActive(seqId: string, msgId: number) {
    setSequences((prev) =>
      prev.map((seq) =>
        seq.id === seqId
          ? { ...seq, messages: seq.messages.map((m) => (m.id === msgId ? { ...m, active: !m.active } : m)) }
          : seq
      )
    );
  }

  function deleteMessage(seqId: string, msgId: number) {
    setSequences((prev) =>
      prev.map((seq) =>
        seq.id === seqId ? { ...seq, messages: seq.messages.filter((m) => m.id !== msgId) } : seq
      )
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "32px 32px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--text-muted)" }}>Sequences</p>
          <h1 className="font-playfair italic font-normal text-white" style={{ fontSize: "32px", marginTop: "4px" }}>Message Sequences</h1>
          <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
            Automatically sent as in-app DMs to creators on a schedule after joining.<br />Email workflows are managed in Klaviyo.
          </p>
        </div>
        <button className="font-montserrat font-semibold"
          style={{ height: "44px", padding: "0 20px", background: "transparent", border: "1px solid var(--accent)", color: "var(--accent)", fontSize: "12px", borderRadius: "8px", cursor: "pointer", flexShrink: 0 }}>
          + New Sequence
        </button>
      </div>

      {/* Sequences list */}
      <div style={{ padding: "24px 32px 32px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {sequences.map((seq) => {
          const isExpanded = expanded.has(seq.id);
          return (
            <div key={seq.id} style={{ background: "var(--surface)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
              {/* Sequence header */}
              <div onClick={() => toggleExpanded(seq.id)}
                style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                <ChevronDown size={18} color="var(--text-muted)" strokeWidth={1.5}
                  style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }} />
                <span className="font-montserrat font-semibold" style={{ fontSize: "16px", color: "var(--text)" }}>{seq.name}</span>
                <span className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "4px" }}>
                  {seq.messages.length} message{seq.messages.length !== 1 ? "s" : ""}
                </span>
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: seq.active ? "#27AE60" : "var(--text-muted)" }} />
                  <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: seq.active ? "#27AE60" : "var(--text-muted)" }}>
                    {seq.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* Sequence body */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "20px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--accent)" }}>Messages</p>
                    <button className="font-montserrat font-semibold" style={{ fontSize: "11px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      + Add Message
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {seq.messages.map((msg) => (
                      <div key={msg.id} style={{ background: "var(--surface-2)", borderRadius: "10px", padding: "14px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="font-montserrat font-bold uppercase"
                            style={{ fontSize: "10px", letterSpacing: "0.10em", color: "var(--accent)", background: "var(--bg)", borderRadius: "6px", padding: "3px 10px" }}>
                            Day {msg.dayOffset}
                          </span>
                          <div style={{ display: "flex", gap: "10px" }}>
                            <button onClick={() => setEditing({ seqId: seq.id, msg })} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                              <PenLine size={14} color="var(--text-muted)" strokeWidth={1.5} />
                            </button>
                            <button onClick={() => deleteMessage(seq.id, msg.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                              <Trash2 size={14} color="var(--text-muted)" strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>

                        <p className="font-montserrat font-semibold" style={{ fontSize: "13px", color: "var(--text)", marginTop: "8px" }}>{msg.subject}</p>

                        <div style={{ marginTop: "6px", background: "var(--surface)", borderRadius: "6px", padding: "10px 12px" }}>
                          <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {msg.body}
                          </p>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
                          <Toggle on={msg.active} onChange={() => toggleMsgActive(seq.id, msg.id)} />
                          <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{msg.active ? "Active" : "Inactive"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editing && <EditModal state={editing} onSave={saveMessage} onClose={() => setEditing(null)} />}
    </div>
  );
}
