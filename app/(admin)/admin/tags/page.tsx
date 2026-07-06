"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, X, Trash2 } from "lucide-react";
import Link from "next/link";

interface TagItem {
  id: string;
  name: string;
  colour: string;
  count: number;
}

const COLOUR_SWATCHES = ["#e4dcd1", "#9b7e56", "#8a8a8a", "#4a5e4a", "#3d3550", "#8b6f5e"];

function TagModal({
  tag,
  onClose,
  onSaved,
}: {
  tag: TagItem | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tagName, setTagName]       = useState(tag?.name ?? "");
  const [selectedColour, setColour] = useState(tag?.colour ?? COLOUR_SWATCHES[0]);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  async function handleSave() {
    if (!tagName.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(tag ? `/api/admin/tags/${tag.id}` : "/api/admin/tags", {
        method: tag ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tagName.trim(), colour: selectedColour }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong — please try again");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Something went wrong — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "12px",
          padding: "24px",
          width: "400px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p
            className="font-montserrat font-bold uppercase"
            style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--accent)" }}
          >
            {tag ? "Edit Tag" : "Create New Tag"}
          </p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
            <X size={16} color="var(--text-muted)" strokeWidth={1.5} />
          </button>
        </div>

        {/* Tag name */}
        <input
          type="text"
          value={tagName}
          onChange={(e) => setTagName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          placeholder="e.g. Boots June 2026"
          className="font-montserrat font-normal"
          style={{
            width: "100%",
            height: "44px",
            background: "var(--surface-2)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            padding: "0 14px",
            color: "var(--text)",
            fontSize: "13px",
            outline: "none",
            marginTop: "12px",
            boxSizing: "border-box",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
        />

        {/* Colour */}
        <p
          className="font-montserrat font-bold uppercase"
          style={{ fontSize: "10px", letterSpacing: "0.10em", color: "var(--text-muted)", marginTop: "16px" }}
        >
          Tag Colour
        </p>
        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          {COLOUR_SWATCHES.map((colour) => (
            <button
              key={colour}
              onClick={() => setColour(colour)}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: colour,
                border: "none",
                cursor: "pointer",
                outline: selectedColour === colour ? "2px solid var(--text)" : "2px solid transparent",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>

        {error && (
          <p className="font-montserrat font-medium" style={{ fontSize: "12px", color: "#F97066", marginTop: "14px" }}>
            {error}
          </p>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!tagName.trim() || saving}
          className="font-montserrat font-semibold"
          style={{
            width: "100%",
            height: "44px",
            background: tagName.trim() ? "var(--accent)" : "var(--surface-2)",
            color: tagName.trim() ? "var(--bg)" : "var(--text-muted)",
            fontSize: "13px",
            border: "none",
            borderRadius: "8px",
            cursor: tagName.trim() ? "pointer" : "not-allowed",
            marginTop: "20px",
          }}
        >
          {saving ? "Saving..." : tag ? "Save Changes" : "Create Tag"}
        </button>

        {/* Cancel */}
        <div style={{ textAlign: "center", marginTop: "10px" }}>
          <button
            onClick={onClose}
            className="font-montserrat font-normal"
            style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      </div>

      <style>{`input::placeholder { color: var(--text-muted); }`}</style>
    </div>
  );
}

export default function TagsPage() {
  const [tags, setTags]         = useState<TagItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]   = useState<TagItem | null>(null);

  const loadTags = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tags");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTags(data.tags || []);
    } catch {
      // keep whatever we had
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTags(); }, [loadTags]);

  async function handleDelete(tag: TagItem) {
    const ok = confirm(
      `Delete the tag "${tag.name}"? It will be removed from all ${tag.count} creator${tag.count === 1 ? "" : "s"}. This cannot be undone.`
    );
    if (!ok) return;
    const res = await fetch(`/api/admin/tags/${tag.id}`, { method: "DELETE" });
    if (res.ok) {
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
    } else {
      alert("Could not delete the tag — please try again.");
    }
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          padding: "32px 32px 24px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p
            className="font-montserrat font-bold uppercase"
            style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--text-muted)" }}
          >
            Tags
          </p>
          <h1
            className="admin-title"
            style={{ fontSize: "32px", marginTop: "4px" }}
          >
            Tag Management
          </h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="font-montserrat font-semibold"
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
            fontSize: "12px",
            padding: "0 16px",
            height: "44px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
        >
          + Create New Tag
        </button>
      </div>

      {/* Tags grid */}
      <div
        style={{
          padding: "0 32px 32px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
        }}
      >
        {loading &&
          [1, 2, 3].map((i) => (
            <div key={i} style={{ height: "140px", background: "var(--surface)", borderRadius: "12px" }} />
          ))}

        {!loading && tags.length === 0 && (
          <p
            className="font-montserrat font-normal"
            style={{ fontSize: "13px", color: "var(--text-muted)", gridColumn: "1 / -1" }}
          >
            No tags yet — create your first one to start grouping creators.
          </p>
        )}

        {tags.map((tag) => (
          <div
            key={tag.id}
            style={{
              background: "var(--surface)",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Top row */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: tag.colour, flexShrink: 0 }} />
              <p className="font-montserrat font-semibold" style={{ fontSize: "14px", color: "var(--text)", flex: 1 }}>
                {tag.name}
              </p>
              <button
                onClick={() => setEditing(tag)}
                title="Edit tag"
                style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}
              >
                <Pencil size={16} color="var(--text-muted)" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => handleDelete(tag)}
                title="Delete tag"
                style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}
              >
                <Trash2 size={16} color="var(--text-muted)" strokeWidth={1.5} />
              </button>
            </div>

            {/* Creator count */}
            <p
              className="font-montserrat font-bold uppercase"
              style={{ fontSize: "9px", letterSpacing: "0.10em", color: "var(--text-muted)", marginTop: "12px" }}
            >
              Creators
            </p>
            <p className="font-montserrat font-semibold" style={{ fontSize: "20px", color: "var(--text)" }}>
              {tag.count}
            </p>

            {/* View link */}
            <Link
              href={`/admin/tags/${tag.id}`}
              className="font-montserrat font-semibold"
              style={{ fontSize: "11px", color: "var(--accent)", textDecoration: "none", display: "inline-block", marginTop: "8px" }}
            >
              View creators →
            </Link>
          </div>
        ))}
      </div>

      {showCreate && (
        <TagModal tag={null} onClose={() => setShowCreate(false)} onSaved={loadTags} />
      )}
      {editing && (
        <TagModal tag={editing} onClose={() => setEditing(null)} onSaved={loadTags} />
      )}
    </div>
  );
}
