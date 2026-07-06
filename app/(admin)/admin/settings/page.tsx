"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ShieldCheck, UserPlus, X } from "lucide-react";

interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  joinedAt: string;
  lastSeenAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  detail: string | null;
  createdAt: string;
  actor: { firstName: string; lastName: string; email: string };
}

const card: React.CSSProperties = {
  background: "var(--surface)",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.06)",
  padding: "24px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "44px",
  background: "var(--surface-2)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  padding: "0 14px",
  color: "var(--text)",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--accent)", marginBottom: "16px" }}>
      {children}
    </p>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="font-montserrat font-bold uppercase" style={{ display: "block", fontSize: "9px", letterSpacing: "0.10em", color: "var(--text-muted)", marginBottom: "6px" }}>
      {children}
    </label>
  );
}

function getAge(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Your Account ──────────────────────────────────────────────────────
function AccountSection() {
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (session?.user?.email) setEmail(session.user.email);
  }, [session?.user?.email]);

  async function handleSave() {
    setMessage(null);
    if (!currentPassword) {
      setMessage({ ok: false, text: "Enter your current password to make changes." });
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ ok: false, text: "New passwords do not match." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, currentPassword, newPassword: newPassword || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error || "Something went wrong." });
      } else {
        setMessage({ ok: true, text: "Saved. If you changed your email, use it next time you sign in." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setMessage({ ok: false, text: "Network error — please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={card}>
      <SectionTitle>Your Account</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div>
          <FieldLabel>Email</FieldLabel>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="font-montserrat font-normal" style={inputStyle} />
        </div>
        <div>
          <FieldLabel>Current Password (required to save)</FieldLabel>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="font-montserrat font-normal" style={inputStyle} />
        </div>
        <div>
          <FieldLabel>New Password (optional)</FieldLabel>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" className="font-montserrat font-normal" style={inputStyle} />
        </div>
        <div>
          <FieldLabel>Confirm New Password</FieldLabel>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="font-montserrat font-normal" style={inputStyle} />
        </div>
      </div>

      {message && (
        <p className="font-montserrat font-medium" style={{ fontSize: "12px", color: message.ok ? "#27AE60" : "#F97066", marginTop: "14px" }}>
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="font-montserrat font-semibold"
        style={{ marginTop: "18px", height: "42px", padding: "0 20px", background: "var(--accent)", color: "var(--bg)", fontSize: "12px", border: "none", borderRadius: "8px", cursor: "pointer", opacity: saving ? 0.6 : 1 }}
      >
        {saving ? "Saving..." : "Save Account Changes"}
      </button>
    </div>
  );
}

// ── Admin Team ────────────────────────────────────────────────────────
function AdminTeamSection() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/admins");
      const data = await res.json();
      if (res.ok) {
        setAdmins(data.admins || []);
        setMeId(data.meId || null);
      }
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!email.trim() || saving) return;
    setSaving(true);
    setError(null);
    setTempPassword(null);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        if (data.tempPassword) setTempPassword(data.tempPassword);
        setEmail(""); setFirstName(""); setLastName("");
        if (!data.tempPassword) setShowAdd(false);
        load();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(admin: Admin) {
    const ok = confirm(`Remove admin access for ${admin.firstName} ${admin.lastName}? They will become a regular account.`);
    if (!ok) return;
    const res = await fetch("/api/admin/admins", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminId: admin.id }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error || "Could not remove admin access.");
    load();
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <SectionTitle>Admin Team</SectionTitle>
        <button
          onClick={() => { setShowAdd(!showAdd); setError(null); setTempPassword(null); }}
          className="font-montserrat font-semibold"
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid rgba(228,220,209,0.25)", color: "var(--accent)", fontSize: "11px", padding: "8px 14px", borderRadius: "8px", cursor: "pointer" }}
        >
          {showAdd ? <X size={13} /> : <UserPlus size={13} />}
          {showAdd ? "Cancel" : "Add Admin"}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: "var(--surface-2)", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
          <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px", lineHeight: 1.5 }}>
            If the email matches an existing member they&apos;ll be promoted to admin. Otherwise a new admin account is created and you&apos;ll get a temporary password to pass on.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr auto", gap: "10px", alignItems: "end" }}>
            <div>
              <FieldLabel>Email</FieldLabel>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@wegotyouagency.com" className="font-montserrat font-normal" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>First Name</FieldLabel>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="font-montserrat font-normal" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Last Name</FieldLabel>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="font-montserrat font-normal" style={inputStyle} />
            </div>
            <button
              onClick={handleAdd}
              disabled={!email.trim() || saving}
              className="font-montserrat font-semibold"
              style={{ height: "44px", padding: "0 18px", background: "var(--accent)", color: "var(--bg)", fontSize: "12px", border: "none", borderRadius: "8px", cursor: "pointer", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Adding..." : "Add"}
            </button>
          </div>
          {error && <p className="font-montserrat font-medium" style={{ fontSize: "12px", color: "#F97066", marginTop: "10px" }}>{error}</p>}
          {tempPassword && (
            <div style={{ marginTop: "12px", background: "rgba(39,174,96,0.12)", border: "1px solid rgba(39,174,96,0.3)", borderRadius: "8px", padding: "12px 14px" }}>
              <p className="font-montserrat font-medium" style={{ fontSize: "12px", color: "#27AE60" }}>
                Admin account created. Temporary password (shown once):{" "}
                <span className="font-montserrat font-bold" style={{ userSelect: "all", color: "var(--text)" }}>{tempPassword}</span>
              </p>
            </div>
          )}
        </div>
      )}

      <div>
        {admins.map((admin, i) => (
          <div
            key={admin.id}
            style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: i < admins.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
          >
            <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ShieldCheck size={15} color="var(--bg)" strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="font-montserrat font-semibold" style={{ fontSize: "13px", color: "var(--text)" }}>
                {admin.firstName} {admin.lastName} {admin.id === meId && <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>(you)</span>}
              </p>
              <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {admin.email} · last active {getAge(admin.lastSeenAt)}
              </p>
            </div>
            {admin.id !== meId && (
              <button
                onClick={() => handleRemove(admin)}
                className="font-montserrat font-semibold"
                style={{ fontSize: "11px", color: "#C0392B", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
              >
                Remove Access
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Audit Log ─────────────────────────────────────────────────────────
function AuditLogSection() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/audit?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.entries) {
          setEntries(data.entries);
          setTotal(data.total || 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div style={{ ...card, padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "24px 24px 12px" }}>
        <SectionTitle>Audit Log</SectionTitle>
        <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "-8px" }}>
          A record of admin actions — campaigns, content, creators, tags, notifications and account changes. Recording started July 2026.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "150px 160px 1fr", gap: "10px", padding: "12px 24px 8px" }}>
        {["When", "Admin", "Action"].map((col) => (
          <span key={col} className="font-montserrat font-bold uppercase" style={{ fontSize: "9px", letterSpacing: "0.08em", color: "var(--text-muted)" }}>{col}</span>
        ))}
      </div>

      {loading && (
        <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)", padding: "8px 24px 24px" }}>Loading...</p>
      )}
      {!loading && entries.length === 0 && (
        <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)", padding: "8px 24px 24px" }}>
          Nothing here yet — admin actions will appear as they happen.
        </p>
      )}
      {entries.map((e, i) => (
        <div key={e.id} style={{ display: "grid", gridTemplateColumns: "150px 160px 1fr", gap: "10px", padding: "10px 24px", borderTop: "1px solid rgba(255,255,255,0.04)", background: i % 2 ? "rgba(255,255,255,0.015)" : "transparent" }}>
          <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }} title={new Date(e.createdAt).toLocaleString("en-GB")}>
            {getAge(e.createdAt)}
          </span>
          <span className="font-montserrat font-medium" style={{ fontSize: "11px", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {e.actor.firstName} {e.actor.lastName}
          </span>
          <span style={{ minWidth: 0 }}>
            <span className="font-montserrat font-semibold" style={{ fontSize: "11px", color: "var(--text)" }}>{e.action}</span>
            {e.detail && (
              <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}> — {e.detail}</span>
            )}
          </span>
        </div>
      ))}

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "16px", alignItems: "center", padding: "14px" }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="font-montserrat font-semibold"
            style={{ fontSize: "11px", color: page <= 1 ? "var(--text-muted)" : "var(--accent)", background: "none", border: "none", cursor: page <= 1 ? "default" : "pointer" }}
          >
            ← Newer
          </button>
          <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="font-montserrat font-semibold"
            style={{ fontSize: "11px", color: page >= totalPages ? "var(--text-muted)" : "var(--accent)", background: "none", border: "none", cursor: page >= totalPages ? "default" : "pointer" }}
          >
            Older →
          </button>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div>
      {/* Header */}
      <div style={{ padding: "32px 32px 24px" }}>
        <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--text-muted)" }}>
          Settings
        </p>
        <h1 className="admin-title" style={{ fontSize: "32px", marginTop: "4px" }}>Admin Settings</h1>
      </div>

      <div style={{ padding: "0 32px 32px", display: "flex", flexDirection: "column", gap: "16px", maxWidth: "980px" }}>
        <AccountSection />
        <AdminTeamSection />
        <AuditLogSection />
      </div>

      <style>{`input::placeholder { color: var(--text-muted); }`}</style>
    </div>
  );
}
