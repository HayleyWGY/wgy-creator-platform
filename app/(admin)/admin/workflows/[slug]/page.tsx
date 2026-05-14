"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, GripVertical, Pencil, Check, X, Clock, Zap } from "lucide-react";

// TODO Phase 3: Replace with DB query — fetch workflow by slug with all steps ordered by delay_days

type StepType = "message";

interface Step {
  id: string;
  delayDays: number;
  type: StepType;
  message: string;
  active: boolean;
}

// Static data per workflow slug
const WORKFLOW_DATA: Record<string, { name: string; trigger: string; steps: Step[] }> = {
  "onboarding": {
    name: "Onboarding",
    trigger: "Creator joins WGY",
    steps: [
      { id: "s1", delayDays: 0,  type: "message", active: true,  message: "Hey {firstName}! 👋 Welcome to WGY! We are so excited to have you here. Head to the Opportunities section to see what brand campaigns are live right now. Any questions, just reply to this message!" },
      { id: "s2", delayDays: 2,  type: "message", active: true,  message: "Hey {firstName}! Just checking in — have you had a chance to browse the Opportunities section yet? There are some great campaigns live right now that we think would be perfect for you!" },
      { id: "s3", delayDays: 5,  type: "message", active: true,  message: "Hi {firstName}! Have you joined the community chat yet? Head to the Community tab and introduce yourself in Group Chat. Our creators love connecting with each other!" },
      { id: "s4", delayDays: 10, type: "message", active: true,  message: "Hey {firstName}! Here are our top tips for getting selected for campaigns: Complete your profile fully, engage with posts by liking and commenting, and apply to everything relevant to your niche!" },
      { id: "s5", delayDays: 30, type: "message", active: false, message: "Hi {firstName}! You have been part of WGY for a whole month! We would love to hear how you are finding it. Any feedback or questions, just reply to this message!" },
    ],
  },
  "payment-failed": {
    name: "Payment Failed Recovery",
    trigger: "Payment fails",
    steps: [
      { id: "p1", delayDays: 0, type: "message", active: true,  message: "Hi {firstName}, we noticed your recent payment didn't go through. Please update your payment details to keep your WGY membership active. Any issues, just reply here!" },
      { id: "p2", delayDays: 3, type: "message", active: true,  message: "Hey {firstName}, just a reminder that your membership is currently paused due to a failed payment. Update your details to continue accessing campaigns and the community." },
      { id: "p3", delayDays: 7, type: "message", active: true,  message: "Hi {firstName}, this is your final reminder — your WGY membership will be cancelled tomorrow if we don't receive payment. We'd love to keep you in the community!" },
    ],
  },
  "re-engagement": {
    name: "Re-engagement",
    trigger: "Manual trigger",
    steps: [
      { id: "r1", delayDays: 0, type: "message", active: true,  message: "Hey {firstName}! We've missed you on WGY. There are some amazing new campaigns live right now that we think would be a great fit for you. Come take a look! 👀" },
      { id: "r2", delayDays: 5, type: "message", active: true,  message: "Hi {firstName}! Just wanted to check in one more time — there's still time to apply for the current campaigns. Let us know if there's anything we can help with!" },
    ],
  },
};

// Fallback for newly created workflows
const EMPTY_WORKFLOW = { name: "New Workflow", trigger: "Manual trigger", steps: [] as Step[] };

// ─── Step editor (inline) ────────────────────────────────────────────────────
function StepCard({
  step,
  index,
  total,
  onUpdate,
  onDelete,
  onToggle,
}: {
  step: Step;
  index: number;
  total: number;
  onUpdate: (id: string, field: "message" | "delayDays", value: string | number) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(step.message);
  const [draftDays, setDraftDays] = useState(String(step.delayDays));
  const [confirmDelete, setConfirmDelete] = useState(false);

  function saveEdit() {
    const days = parseInt(draftDays, 10);
    onUpdate(step.id, "message", draft);
    onUpdate(step.id, "delayDays", isNaN(days) ? 0 : days);
    setEditing(false);
  }

  function cancelEdit() {
    setDraft(step.message);
    setDraftDays(String(step.delayDays));
    setEditing(false);
  }

  const CHAR_LIMIT = 500;

  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
      {/* Timeline column */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: "16px" }}>
        {/* Drag handle (visual only for now) */}
        <GripVertical size={16} color="#4a4a4a" strokeWidth={1.5} style={{ cursor: "grab" }} />
        {/* Step number circle */}
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: step.active ? "#e4dcd1" : "#333333",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "6px",
            flexShrink: 0,
          }}
        >
          <span className="font-montserrat font-bold" style={{ fontSize: "11px", color: step.active ? "#222222" : "#706b6b" }}>
            {index + 1}
          </span>
        </div>
        {/* Connector line */}
        {index < total - 1 && (
          <div style={{ width: "1px", flex: 1, minHeight: "24px", background: "rgba(255,255,255,0.06)", marginTop: "6px" }} />
        )}
      </div>

      {/* Card */}
      <div
        style={{
          flex: 1,
          background: "#2a2a2a",
          borderRadius: "10px",
          padding: "16px",
          marginBottom: index < total - 1 ? "0" : "0",
          border: `1px solid ${step.active ? "rgba(228,220,209,0.1)" : "rgba(255,255,255,0.04)"}`,
          opacity: step.active ? 1 : 0.6,
        }}
      >
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Day badge */}
          {editing ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Clock size={13} color="#706b6b" strokeWidth={1.5} />
              <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b" }}>
                Day
              </span>
              <input
                type="number"
                min="0"
                value={draftDays}
                onChange={(e) => setDraftDays(e.target.value)}
                className="font-montserrat font-semibold"
                style={{
                  width: "56px",
                  height: "28px",
                  background: "#333333",
                  border: "1px solid rgba(228,220,209,0.3)",
                  borderRadius: "6px",
                  padding: "0 8px",
                  color: "#e4dcd1",
                  fontSize: "12px",
                  outline: "none",
                  textAlign: "center",
                }}
              />
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Clock size={12} color="#706b6b" strokeWidth={1.5} />
              <span className="font-montserrat font-semibold" style={{ fontSize: "11px", color: "#706b6b" }}>
                Day {step.delayDays}
              </span>
            </div>
          )}

          {/* Active toggle */}
          <button
            onClick={() => onToggle(step.id)}
            className="font-montserrat font-semibold uppercase"
            style={{
              fontSize: "9px",
              letterSpacing: "0.08em",
              background: step.active ? "rgba(39,174,96,0.15)" : "#333333",
              color: step.active ? "#27AE60" : "#706b6b",
              padding: "3px 8px",
              borderRadius: "20px",
              border: "none",
              cursor: "pointer",
            }}
          >
            {step.active ? "Active" : "Inactive"}
          </button>

          {/* Actions right */}
          <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
            {editing ? (
              <>
                <button onClick={cancelEdit} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                  <X size={15} color="#706b6b" strokeWidth={1.5} />
                </button>
                <button onClick={saveEdit} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                  <Check size={15} color="#27AE60" strokeWidth={1.5} />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                  <Pencil size={14} color="#706b6b" strokeWidth={1.5} />
                </button>
                {confirmDelete ? (
                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#C0392B" }}>Delete?</span>
                    <button onClick={() => onDelete(step.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                      <Check size={14} color="#C0392B" strokeWidth={1.5} />
                    </button>
                    <button onClick={() => setConfirmDelete(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                      <X size={14} color="#706b6b" strokeWidth={1.5} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                    <Trash2 size={14} color="#706b6b" strokeWidth={1.5} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Message */}
        <div style={{ marginTop: "10px" }}>
          {editing ? (
            <div style={{ position: "relative" }}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, CHAR_LIMIT))}
                rows={4}
                autoFocus
                className="font-montserrat font-normal"
                style={{
                  width: "100%",
                  background: "#333333",
                  border: "1px solid rgba(228,220,209,0.3)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  paddingBottom: "28px",
                  color: "#ffffff",
                  fontSize: "13px",
                  outline: "none",
                  resize: "none",
                  lineHeight: 1.6,
                  caretColor: "#e4dcd1",
                }}
              />
              <span
                className="font-montserrat font-normal"
                style={{ position: "absolute", bottom: "8px", right: "12px", fontSize: "10px", color: "#706b6b", pointerEvents: "none" }}
              >
                {draft.length} / {CHAR_LIMIT}
              </span>
              <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b", marginTop: "6px" }}>
                Use <span style={{ color: "#e4dcd1" }}>{"{firstName}"}</span> to personalise. Click ✓ to save.
              </p>
            </div>
          ) : (
            <p
              className="font-montserrat font-normal"
              style={{ fontSize: "13px", color: "#c8c3bc", lineHeight: 1.6, whiteSpace: "pre-wrap" }}
            >
              {step.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Add step form ─────────────────────────────────────────────────────────
function AddStepForm({ onAdd, onCancel }: { onAdd: (step: Step) => void; onCancel: () => void }) {
  const [days, setDays] = useState("");
  const [message, setMessage] = useState("");
  const CHAR_LIMIT = 500;

  function handleAdd() {
    const d = parseInt(days, 10);
    if (!message.trim() || isNaN(d)) return;
    onAdd({
      id: `step_${Date.now()}`,
      delayDays: d,
      type: "message",
      active: true,
      message: message.trim(),
    });
  }

  const valid = message.trim().length > 0 && days !== "" && !isNaN(parseInt(days, 10));

  return (
    <div style={{ background: "#2a2a2a", borderRadius: "10px", padding: "16px", border: "1px solid rgba(228,220,209,0.2)" }}>
      <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.10em", color: "#e4dcd1", marginBottom: "12px" }}>
        New Step
      </p>

      {/* Day input */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <Clock size={13} color="#706b6b" strokeWidth={1.5} />
        <span className="font-montserrat font-normal" style={{ fontSize: "12px", color: "#706b6b" }}>Send on day</span>
        <input
          type="number"
          min="0"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          placeholder="0"
          className="font-montserrat font-semibold"
          style={{ width: "64px", height: "32px", background: "#333333", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "0 10px", color: "#ffffff", fontSize: "13px", outline: "none", textAlign: "center", caretColor: "#e4dcd1" }}
          onFocus={(e) => (e.target.style.borderColor = "#e4dcd1")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
        />
        <span className="font-montserrat font-normal" style={{ fontSize: "12px", color: "#706b6b" }}>after trigger</span>
      </div>

      {/* Message textarea */}
      <div style={{ position: "relative" }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, CHAR_LIMIT))}
          placeholder={"Write your message...\nUse {firstName} to personalise."}
          rows={4}
          className="font-montserrat font-normal"
          style={{
            width: "100%",
            background: "#333333",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            padding: "10px 14px",
            paddingBottom: "28px",
            color: "#ffffff",
            fontSize: "13px",
            outline: "none",
            resize: "none",
            lineHeight: 1.6,
            caretColor: "#e4dcd1",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#e4dcd1")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
        />
        <span className="font-montserrat font-normal" style={{ position: "absolute", bottom: "8px", right: "12px", fontSize: "10px", color: "#706b6b", pointerEvents: "none" }}>
          {message.length} / {CHAR_LIMIT}
        </span>
      </div>

      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        <button
          onClick={onCancel}
          className="font-montserrat font-semibold"
          style={{ height: "36px", padding: "0 14px", borderRadius: "8px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#706b6b", fontSize: "12px", cursor: "pointer" }}
        >
          Cancel
        </button>
        <button
          onClick={handleAdd}
          disabled={!valid}
          className="font-montserrat font-semibold"
          style={{ height: "36px", padding: "0 16px", borderRadius: "8px", background: valid ? "#e4dcd1" : "#333333", border: "none", color: valid ? "#222222" : "#706b6b", fontSize: "12px", cursor: valid ? "pointer" : "default", transition: "background 0.15s" }}
        >
          Add Step
        </button>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function WorkflowEditorPage({ params }: { params: { slug: string } }) {
  const base = WORKFLOW_DATA[params.slug] ?? EMPTY_WORKFLOW;
  const [steps, setSteps] = useState<Step[]>(base.steps);
  const [showAddStep, setShowAddStep] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleUpdate(id: string, field: "message" | "delayDays", value: string | number) {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  }

  function handleDelete(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }

  function handleToggle(id: string) {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  }

  function handleAddStep(step: Step) {
    // Insert sorted by delayDays
    setSteps((prev) => {
      const next = [...prev, step];
      return next.sort((a, b) => a.delayDays - b.delayDays);
    });
    setShowAddStep(false);
  }

  function handleSave() {
    // TODO Phase 3: PATCH /api/admin/workflows/[slug]/steps
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const activeCount = steps.filter((s) => s.active).length;

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "32px 32px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <Link
            href="/admin/workflows"
            style={{ display: "inline-flex", alignItems: "center", gap: "5px", textDecoration: "none", marginBottom: "14px" }}
          >
            <ArrowLeft size={14} color="#706b6b" strokeWidth={1.5} />
            <span className="font-montserrat font-normal" style={{ fontSize: "12px", color: "#706b6b" }}>
              All Workflows
            </span>
          </Link>
          <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "#706b6b" }}>
            Workflow
          </p>
          <h1 className="font-playfair italic font-normal text-white" style={{ fontSize: "32px", marginTop: "4px" }}>
            {base.name}
          </h1>

          {/* Trigger badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px" }}>
            <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#333333", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={12} color="#e4dcd1" strokeWidth={1.5} />
            </div>
            <span className="font-montserrat font-normal" style={{ fontSize: "12px", color: "#706b6b" }}>
              Triggered when: <span style={{ color: "#e4dcd1" }}>{base.trigger}</span>
            </span>
            <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#4a4a4a" }}>·</span>
            <span className="font-montserrat font-normal" style={{ fontSize: "12px", color: "#706b6b" }}>
              {activeCount} of {steps.length} step{steps.length !== 1 ? "s" : ""} active
            </span>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="font-montserrat font-semibold"
          style={{
            height: "44px",
            padding: "0 20px",
            background: saved ? "#27AE60" : "#e4dcd1",
            borderRadius: "8px",
            border: "none",
            color: saved ? "#ffffff" : "#222222",
            fontSize: "13px",
            cursor: "pointer",
            flexShrink: 0,
            transition: "background 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {saved ? <><Check size={15} strokeWidth={2} /> Saved</> : "Save Changes"}
        </button>
      </div>

      {/* Steps */}
      <div style={{ padding: "24px 32px 8px", maxWidth: "680px" }}>
        {steps.length === 0 && !showAddStep && (
          <div
            style={{
              background: "#2a2a2a",
              borderRadius: "10px",
              padding: "40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              border: "1px dashed rgba(255,255,255,0.08)",
            }}
          >
            <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "#706b6b" }}>
              No steps yet. Add your first message below.
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {steps.map((step, i) => (
            <StepCard
              key={step.id}
              step={step}
              index={i}
              total={steps.length}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>

        {/* Add step */}
        <div style={{ marginTop: steps.length > 0 ? "16px" : "0" }}>
          {showAddStep ? (
            <AddStepForm onAdd={handleAddStep} onCancel={() => setShowAddStep(false)} />
          ) : (
            <button
              onClick={() => setShowAddStep(true)}
              className="font-montserrat font-semibold"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                height: "40px",
                padding: "0 16px",
                background: "transparent",
                border: "1px dashed rgba(228,220,209,0.25)",
                borderRadius: "8px",
                color: "#e4dcd1",
                fontSize: "12px",
                cursor: "pointer",
                width: "100%",
                justifyContent: "center",
              }}
            >
              <Plus size={14} strokeWidth={2} />
              Add Step
            </button>
          )}
        </div>
      </div>

      {/* Hint */}
      <div style={{ padding: "12px 32px 40px", maxWidth: "680px" }}>
        <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#4a4a4a", lineHeight: 1.6 }}>
          Steps are sent in order based on their day number after the trigger. Adding a step at day 25 will automatically slot it in between day 10 and day 30. Click the pencil icon on any step to edit its message or day number.
        </p>
      </div>

      <style>{`
        input::placeholder, textarea::placeholder { color: #706b6b; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.3; }
      `}</style>
    </div>
  );
}
