"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Pause, Pencil, Trash2, Plus, Zap, Clock, Users } from "lucide-react";

// TODO Phase 3: Replace with DB query — workflows table with step counts and creator stats

type Trigger = "on_join" | "manual" | "tag_added" | "payment_failed";
type Status = "active" | "paused";

interface Workflow {
  slug: string;
  name: string;
  description: string;
  trigger: Trigger;
  triggerLabel: string;
  status: Status;
  stepCount: number;
  enrolledCount: number;
  completedCount: number;
  lastEdited: string;
}

const INITIAL_WORKFLOWS: Workflow[] = [
  {
    slug: "onboarding",
    name: "Onboarding",
    description: "Welcome sequence for all new creators joining WGY.",
    trigger: "on_join",
    triggerLabel: "Creator joins WGY",
    status: "active",
    stepCount: 5,
    enrolledCount: 1024,
    completedCount: 847,
    lastEdited: "May 8, 2026",
  },
  {
    slug: "payment-failed",
    name: "Payment Failed Recovery",
    description: "Sent when a creator's subscription payment fails.",
    trigger: "payment_failed",
    triggerLabel: "Payment fails",
    status: "active",
    stepCount: 3,
    enrolledCount: 12,
    completedCount: 7,
    lastEdited: "Apr 20, 2026",
  },
  {
    slug: "re-engagement",
    name: "Re-engagement",
    description: "For creators who haven't opened the app in 30 days.",
    trigger: "manual",
    triggerLabel: "Manual trigger",
    status: "paused",
    stepCount: 2,
    enrolledCount: 0,
    completedCount: 0,
    lastEdited: "Mar 12, 2026",
  },
];

const TRIGGER_ICONS: Record<Trigger, React.ReactNode> = {
  on_join:       <Zap size={13} color="var(--accent)" strokeWidth={1.5} />,
  manual:        <Play size={13} color="var(--accent)" strokeWidth={1.5} />,
  tag_added:     <Users size={13} color="var(--accent)" strokeWidth={1.5} />,
  payment_failed:<Clock size={13} color="var(--accent)" strokeWidth={1.5} />,
};

// New workflow modal
function NewWorkflowModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (w: Workflow) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [trigger, setTrigger] = useState<Trigger>("on_join");

  const TRIGGER_OPTIONS: { value: Trigger; label: string }[] = [
    { value: "on_join",        label: "Creator joins WGY" },
    { value: "tag_added",      label: "Tag added to creator" },
    { value: "payment_failed", label: "Payment fails" },
    { value: "manual",         label: "Manual trigger" },
  ];

  const TRIGGER_LABELS: Record<Trigger, string> = {
    on_join: "Creator joins WGY",
    tag_added: "Tag added to creator",
    payment_failed: "Payment fails",
    manual: "Manual trigger",
  };

  function handleCreate() {
    if (!name.trim()) return;
    onCreate({
      slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      name: name.trim(),
      description: desc.trim(),
      trigger,
      triggerLabel: TRIGGER_LABELS[trigger],
      status: "paused",
      stepCount: 0,
      enrolledCount: 0,
      completedCount: 0,
      lastEdited: "Just now",
    });
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--surface)", borderRadius: "12px", padding: "28px", maxWidth: "460px", width: "100%", margin: "0 20px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--accent)" }}>
          New Workflow
        </p>
        <h2 className="admin-title" style={{ fontSize: "22px", marginTop: "6px" }}>
          Create Workflow
        </h2>

        <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.08em", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
              Workflow Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Onboarding, Win-back..."
              autoFocus
              className="font-montserrat font-normal"
              style={{ width: "100%", height: "44px", background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "0 14px", color: "var(--text)", fontSize: "14px", outline: "none", caretColor: "var(--accent)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
            />
          </div>

          <div>
            <label className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.08em", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
              Description
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What does this workflow do?"
              rows={2}
              className="font-montserrat font-normal"
              style={{ width: "100%", background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "10px 14px", color: "var(--text)", fontSize: "14px", outline: "none", resize: "none", caretColor: "var(--accent)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
            />
          </div>

          <div>
            <label className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.08em", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
              Trigger
            </label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as Trigger)}
              className="font-montserrat font-normal"
              style={{ width: "100%", height: "44px", background: "var(--surface-2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "0 14px", color: "var(--text)", fontSize: "13px", outline: "none", appearance: "none", cursor: "pointer" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
            >
              {TRIGGER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
          <button
            onClick={onClose}
            className="font-montserrat font-semibold"
            style={{ flex: 1, height: "44px", borderRadius: "8px", background: "transparent", border: "1px solid rgba(228,220,209,0.2)", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="font-montserrat font-semibold"
            style={{ flex: 2, height: "44px", borderRadius: "8px", background: name.trim() ? "var(--accent)" : "var(--surface-2)", border: "none", color: name.trim() ? "var(--bg)" : "var(--text-muted)", fontSize: "13px", cursor: name.trim() ? "pointer" : "default", transition: "background 0.15s" }}
          >
            Create Workflow
          </button>
        </div>
      </div>
      <style>{`input::placeholder, textarea::placeholder { color: var(--text-muted); } select option { background: var(--surface-2); }`}</style>
    </div>
  );
}

// Delete confirmation
function DeleteModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
      onClick={onCancel}
    >
      <div
        style={{ background: "var(--surface)", borderRadius: "12px", padding: "28px", maxWidth: "400px", width: "100%", margin: "0 20px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="admin-title" style={{ fontSize: "20px" }}>
          Delete &ldquo;{name}&rdquo;?
        </h2>
        <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, marginTop: "10px" }}>
          This will permanently delete the workflow and all its steps. Creators already enrolled will not receive further messages.
        </p>
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={onCancel} className="font-montserrat font-semibold" style={{ flex: 1, height: "40px", borderRadius: "8px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={onConfirm} className="font-montserrat font-semibold" style={{ flex: 1, height: "40px", borderRadius: "8px", background: "#C0392B", border: "none", color: "var(--text)", fontSize: "13px", cursor: "pointer" }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>(INITIAL_WORKFLOWS);
  const [showNew, setShowNew] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function toggleStatus(slug: string) {
    setWorkflows((prev) =>
      prev.map((w) =>
        w.slug === slug ? { ...w, status: w.status === "active" ? "paused" : "active" } : w
      )
    );
  }

  function handleCreate(w: Workflow) {
    setWorkflows((prev) => [...prev, w]);
    setShowNew(false);
  }

  function handleDelete(slug: string) {
    setWorkflows((prev) => prev.filter((w) => w.slug !== slug));
    setDeleting(null);
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{ padding: "32px 32px 24px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}
      >
        <div>
          <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--text-muted)" }}>
            Workflows
          </p>
          <h1 className="admin-title" style={{ fontSize: "32px", marginTop: "4px" }}>
            Message Workflows
          </h1>
          <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
            Automated message sequences triggered by creator actions or time.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="font-montserrat font-semibold"
          style={{ display: "flex", alignItems: "center", gap: "6px", height: "44px", padding: "0 20px", background: "var(--accent)", borderRadius: "8px", border: "none", color: "var(--bg)", fontSize: "13px", cursor: "pointer", flexShrink: 0 }}
        >
          <Plus size={15} strokeWidth={2} />
          New Workflow
        </button>
      </div>

      {/* Workflow cards */}
      <div style={{ padding: "0 32px 32px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {workflows.map((wf) => (
          <div
            key={wf.slug}
            style={{
              background: "var(--surface)",
              borderRadius: "12px",
              padding: "20px 24px",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              gap: "20px",
            }}
          >
            {/* Status dot */}
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: wf.status === "active" ? "#27AE60" : "var(--text-muted)",
                flexShrink: 0,
              }}
            />

            {/* Main info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <p className="font-montserrat font-semibold" style={{ fontSize: "15px", color: "var(--text)" }}>
                  {wf.name}
                </p>
                <span
                  className="font-montserrat font-semibold uppercase"
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.08em",
                    background: wf.status === "active" ? "rgba(39,174,96,0.15)" : "var(--surface-2)",
                    color: wf.status === "active" ? "#27AE60" : "var(--text-muted)",
                    padding: "3px 8px",
                    borderRadius: "20px",
                  }}
                >
                  {wf.status === "active" ? "Active" : "Paused"}
                </span>
              </div>
              <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>
                {wf.description}
              </p>

              {/* Meta row */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "10px", flexWrap: "wrap" }}>
                {/* Trigger */}
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {TRIGGER_ICONS[wf.trigger]}
                  </div>
                  <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {wf.triggerLabel}
                  </span>
                </div>
                <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>·</span>
                <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {wf.stepCount} step{wf.stepCount !== 1 ? "s" : ""}
                </span>
                <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>·</span>
                <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {wf.enrolledCount.toLocaleString()} enrolled
                </span>
                {wf.completedCount > 0 && (
                  <>
                    <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>·</span>
                    <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {wf.completedCount.toLocaleString()} completed
                    </span>
                  </>
                )}
                <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>·</span>
                <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Last edited {wf.lastEdited}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              {/* Pause / Resume */}
              <button
                onClick={() => toggleStatus(wf.slug)}
                title={wf.status === "active" ? "Pause workflow" : "Resume workflow"}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "var(--surface-2)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {wf.status === "active"
                  ? <Pause size={15} color="var(--text-muted)" strokeWidth={1.5} />
                  : <Play size={15} color="#27AE60" strokeWidth={1.5} />
                }
              </button>

              {/* Edit / open */}
              <Link
                href={`/admin/workflows/${wf.slug}`}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "var(--surface-2)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                }}
                title="Edit workflow"
              >
                <Pencil size={15} color="var(--accent)" strokeWidth={1.5} />
              </Link>

              {/* Delete */}
              <button
                onClick={() => setDeleting(wf.slug)}
                title="Delete workflow"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "var(--surface-2)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={15} color="var(--text-muted)" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        ))}

        {workflows.length === 0 && (
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "12px",
              padding: "60px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              border: "1px dashed rgba(255,255,255,0.1)",
            }}
          >
            <Zap size={32} color="var(--text-muted)" strokeWidth={1} />
            <p className="admin-title" style={{ fontSize: "18px", marginTop: "16px" }}>
              No workflows yet
            </p>
            <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
              Create your first workflow to automate creator messaging.
            </p>
            <button
              onClick={() => setShowNew(true)}
              className="font-montserrat font-semibold"
              style={{ marginTop: "20px", height: "44px", padding: "0 20px", background: "var(--accent)", borderRadius: "8px", border: "none", color: "var(--bg)", fontSize: "13px", cursor: "pointer" }}
            >
              + New Workflow
            </button>
          </div>
        )}
      </div>

      {showNew && <NewWorkflowModal onClose={() => setShowNew(false)} onCreate={handleCreate} />}
      {deleting && (
        <DeleteModal
          name={workflows.find((w) => w.slug === deleting)?.name ?? ""}
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
