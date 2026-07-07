"use client";

import { useCallback, useEffect, useState } from "react";
import { PenLine, Trash2, X, Plus } from "lucide-react";

interface Step {
  id: string;
  dayOffset: number;
  subject: string;
  body: string;
  isActive: boolean;
}

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

function StepModal({
  step,
  onSaved,
  onClose,
}: {
  step: Step | null; // null = new
  onSaved: () => void;
  onClose: () => void;
}) {
  const [dayOffset, setDayOffset] = useState(step ? String(step.dayOffset) : "1");
  const [subject, setSubject]     = useState(step?.subject ?? "");
  const [body, setBody]           = useState(step?.body ?? "");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function save() {
    if (!body.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(step ? `/api/admin/sequences/${step.id}` : "/api/admin/sequences", {
        method: step ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayOffset: Number(dayOffset), subject, body }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not save."); return; }
      onSaved();
      onClose();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--surface)", borderRadius: "12px", padding: "24px", width: "480px", maxWidth: "90vw" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--accent)" }}>{step ? "Edit Step" : "New Step"}</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}><X size={16} color="var(--text-muted)" strokeWidth={1.5} /></button>
        </div>

        <label className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.10em", color: "var(--text-muted)" }}>Days after joining</label>
        <input type="number" min={0} value={dayOffset} onChange={(e) => setDayOffset(e.target.value)}
          className="font-montserrat font-normal"
          style={{ display: "block", width: "100px", height: "40px", background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "0 12px", color: "var(--text)", fontSize: "13px", outline: "none", marginTop: "6px", marginBottom: "14px" }} />

        <label className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.10em", color: "var(--text-muted)" }}>Label (internal)</label>
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Welcome message"
          className="font-montserrat font-normal"
          style={{ display: "block", width: "100%", height: "40px", background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "0 12px", color: "var(--text)", fontSize: "13px", outline: "none", marginTop: "6px", marginBottom: "14px", boxSizing: "border-box" }} />

        <label className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.10em", color: "var(--text-muted)" }}>Message</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hey {firstName}! …"
          className="font-montserrat font-normal"
          style={{ display: "block", width: "100%", minHeight: "120px", background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "12px", color: "var(--text)", fontSize: "13px", outline: "none", resize: "vertical", marginTop: "6px", boxSizing: "border-box" }} />
        <p className="font-montserrat font-normal" style={{ fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic", marginTop: "4px" }}>
          {"{firstName}"} is replaced with the creator&apos;s first name automatically
        </p>

        {error && <p className="font-montserrat font-medium" style={{ fontSize: "12px", color: "#F97066", marginTop: "10px" }}>{error}</p>}

        <button onClick={save} disabled={!body.trim() || saving}
          className="font-montserrat font-semibold"
          style={{ width: "100%", height: "44px", background: body.trim() ? "var(--accent)" : "var(--surface-2)", color: body.trim() ? "var(--bg)" : "var(--text-muted)", fontSize: "13px", border: "none", borderRadius: "8px", cursor: body.trim() ? "pointer" : "not-allowed", marginTop: "20px" }}>
          {saving ? "Saving…" : step ? "Save Changes" : "Add Step"}
        </button>
      </div>
      <style>{`input::placeholder, textarea::placeholder { color: var(--text-muted); }`}</style>
    </div>
  );
}

export default function OnboardingPage() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ step: Step | null } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sequences");
      const data = await res.json();
      if (res.ok) setSteps(data.steps || []);
    } catch {
      // keep previous
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(step: Step) {
    setSteps(prev => prev.map(s => s.id === step.id ? { ...s, isActive: !s.isActive } : s));
    await fetch(`/api/admin/sequences/${step.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !step.isActive }),
    }).catch(() => load());
  }

  async function remove(step: Step) {
    if (!confirm(`Delete the Day ${step.dayOffset} step?`)) return;
    await fetch(`/api/admin/sequences/${step.id}`, { method: "DELETE" });
    setSteps(prev => prev.filter(s => s.id !== step.id));
  }

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "32px 32px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--text-muted)" }}>Onboarding</p>
          <h1 className="admin-title" style={{ fontSize: "32px", marginTop: "4px" }}>New-Member Sequence</h1>
          <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px", maxWidth: "560px", lineHeight: 1.5 }}>
            A timed series of WGY DMs sent automatically to each new member, counted from the day they join. Set the day, write the message, toggle steps on or off.
          </p>
        </div>
        <button
          onClick={() => setModal({ step: null })}
          className="font-montserrat font-semibold"
          style={{ display: "flex", alignItems: "center", gap: "6px", height: "44px", padding: "0 18px", background: "var(--accent)", border: "none", color: "var(--bg)", fontSize: "12px", borderRadius: "8px", cursor: "pointer", flexShrink: 0 }}
        >
          <Plus size={14} /> Add Step
        </button>
      </div>

      <div style={{ padding: "24px 32px 40px", maxWidth: "720px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {loading && <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading…</p>}
        {!loading && steps.length === 0 && (
          <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            No steps yet — add your first onboarding message above.
          </p>
        )}
        {steps.map((step) => (
          <div key={step.id} style={{ background: "var(--surface)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)", padding: "16px 18px", opacity: step.isActive ? 1 : 0.6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="font-montserrat font-bold uppercase"
                style={{ fontSize: "10px", letterSpacing: "0.10em", color: "var(--accent)", background: "var(--surface-2)", borderRadius: "6px", padding: "4px 10px" }}>
                Day {step.dayOffset}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Toggle on={step.isActive} onChange={() => toggleActive(step)} />
                <button onClick={() => setModal({ step })} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }} title="Edit">
                  <PenLine size={15} color="var(--text-muted)" strokeWidth={1.5} />
                </button>
                <button onClick={() => remove(step)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }} title="Delete">
                  <Trash2 size={15} color="var(--text-muted)" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <p className="font-montserrat font-semibold" style={{ fontSize: "13px", color: "var(--text)", marginTop: "10px" }}>{step.subject}</p>
            <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6, marginTop: "4px", whiteSpace: "pre-wrap" }}>{step.body}</p>
          </div>
        ))}
      </div>

      {modal && <StepModal step={modal.step} onSaved={load} onClose={() => setModal(null)} />}
    </div>
  );
}
