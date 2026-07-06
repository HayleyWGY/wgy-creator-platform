"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Search, X } from "lucide-react";

interface TagCreator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl: string | null;
  membershipStatus: string;
  joinedAt: string;
  assignedAt: string;
}

interface TagDetail {
  id: string;
  name: string;
  colour: string;
  creators: TagCreator[];
}

interface SearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

function StatusPill({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span
      className="font-montserrat font-semibold uppercase"
      style={{
        fontSize: "9px",
        letterSpacing: "0.10em",
        background: active ? "var(--accent)" : "rgba(192,57,43,0.15)",
        color: active ? "var(--bg)" : "#C0392B",
        padding: "3px 10px",
        borderRadius: "20px",
        justifySelf: "start",
      }}
    >
      {active ? "Active" : status === "cancelled" ? "Cancelled" : status.replace("_", " ")}
    </span>
  );
}

export default function TagDetailPage() {
  const { tagId } = useParams<{ tagId: string }>();
  const [tag, setTag]         = useState<TagDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Add-creator search
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTag = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/tags/${tagId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTag(data.tag);
    } catch {
      setTag(null);
    } finally {
      setLoading(false);
    }
  }, [tagId]);

  useEffect(() => { if (tagId) loadTag(); }, [tagId, loadTag]);

  // Debounced creator search for the "add creators" box
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/creators?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.creators || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  async function addCreator(creatorId: string) {
    const res = await fetch(`/api/admin/tags/${tagId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addCreatorId: creatorId }),
    });
    if (res.ok) {
      setQuery("");
      setResults([]);
      loadTag();
    } else {
      alert("Could not add the creator — please try again.");
    }
  }

  async function removeCreator(creator: TagCreator) {
    const ok = confirm(`Remove ${creator.firstName} ${creator.lastName} from "${tag?.name}"?`);
    if (!ok) return;
    const res = await fetch(`/api/admin/tags/${tagId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeCreatorId: creator.id }),
    });
    if (res.ok) {
      setTag((prev) => prev ? { ...prev, creators: prev.creators.filter((c) => c.id !== creator.id) } : prev);
    } else {
      alert("Could not remove the tag — please try again.");
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "32px" }}>
        <div style={{ height: "32px", width: "240px", background: "var(--surface)", borderRadius: "8px" }} />
      </div>
    );
  }

  if (!tag) {
    return (
      <div style={{ padding: "32px" }}>
        <Link href="/admin/tags" className="font-montserrat font-semibold" style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none" }}>
          ← Back to Tags
        </Link>
        <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "24px" }}>
          Tag not found.
        </p>
      </div>
    );
  }

  const memberIds = new Set(tag.creators.map((c) => c.id));

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "32px 32px 24px" }}>
        <Link
          href="/admin/tags"
          className="font-montserrat font-semibold"
          style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none", display: "inline-block", marginBottom: "16px" }}
        >
          ← Back to Tags
        </Link>

        <p
          className="font-montserrat font-bold uppercase"
          style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--text-muted)" }}
        >
          Tags
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: tag.colour,
              flexShrink: 0,
              marginTop: "4px",
            }}
          />
          <h1 className="admin-title" style={{ fontSize: "32px" }}>
            {tag.name}
          </h1>
        </div>

        <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
          {tag.creators.length} creator{tag.creators.length === 1 ? "" : "s"} with this tag
        </p>
      </div>

      {/* Add creators */}
      <div style={{ padding: "0 32px 24px", maxWidth: "520px", position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "var(--surface)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            padding: "0 14px",
            height: "44px",
          }}
        >
          <Search size={15} color="var(--text-muted)" strokeWidth={1.5} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add creators — search by name or email"
            className="font-montserrat font-normal"
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "13px" }}
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
              <X size={14} color="var(--text-muted)" strokeWidth={1.5} />
            </button>
          )}
        </div>

        {query.trim().length >= 2 && (
          <div
            style={{
              position: "absolute",
              top: "48px",
              left: "32px",
              right: 0,
              background: "var(--surface-2)",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              zIndex: 20,
              overflow: "hidden",
            }}
          >
            {searching && (
              <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)", padding: "12px 16px" }}>
                Searching...
              </p>
            )}
            {!searching && results.length === 0 && (
              <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)", padding: "12px 16px" }}>
                No creators found.
              </p>
            )}
            {!searching && results.map((r) => {
              const already = memberIds.has(r.id);
              return (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "10px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p className="font-montserrat font-medium" style={{ fontSize: "13px", color: "var(--text)" }}>
                      {r.firstName} {r.lastName}
                    </p>
                    <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.email}
                    </p>
                  </div>
                  {already ? (
                    <span className="font-montserrat font-semibold" style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>
                      Added
                    </span>
                  ) : (
                    <button
                      onClick={() => addCreator(r.id)}
                      className="font-montserrat font-semibold"
                      style={{
                        fontSize: "11px",
                        color: "var(--bg)",
                        background: "var(--accent)",
                        border: "none",
                        borderRadius: "20px",
                        padding: "5px 14px",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      + Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ padding: "0 32px 32px" }}>
        <div style={{ background: "var(--surface)", borderRadius: "12px", overflow: "hidden" }}>
          {/* Header */}
          <div
            style={{
              background: "var(--surface)",
              padding: "12px 20px",
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: "12px",
            }}
          >
            {["Name", "Status", "Tagged", "Actions"].map((col) => (
              <span
                key={col}
                className="font-montserrat font-bold uppercase"
                style={{ fontSize: "10px", letterSpacing: "0.10em", color: "var(--text-muted)" }}
              >
                {col}
              </span>
            ))}
          </div>

          {tag.creators.length === 0 && (
            <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", padding: "20px" }}>
              No creators have this tag yet — use the search above to add some.
            </p>
          )}

          {/* Rows */}
          {tag.creators.map((creator, i) => (
            <div
              key={creator.id}
              style={{
                padding: "16px 20px",
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr",
                gap: "12px",
                alignItems: "center",
                borderBottom: i < tag.creators.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              {/* Name */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span className="font-montserrat font-bold" style={{ fontSize: "10px", color: "var(--bg)" }}>
                    {creator.firstName[0]}{creator.lastName[0]}
                  </span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className="font-montserrat font-medium" style={{ fontSize: "13px", color: "var(--text)" }}>
                    {creator.firstName} {creator.lastName}
                  </p>
                  <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {creator.email}
                  </p>
                </div>
              </div>

              <StatusPill status={creator.membershipStatus} />

              <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {new Date(creator.assignedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>

              <div style={{ display: "flex", gap: "12px" }}>
                <Link
                  href={`/admin/creators?open=${creator.id}`}
                  className="font-montserrat font-semibold"
                  style={{ fontSize: "11px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "none" }}
                >
                  View
                </Link>
                <button
                  onClick={() => removeCreator(creator)}
                  className="font-montserrat font-semibold"
                  style={{ fontSize: "11px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  Remove Tag
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
