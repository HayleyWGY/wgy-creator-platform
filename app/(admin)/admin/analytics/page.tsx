"use client";

import { useEffect, useState } from "react";

interface MonthPoint { label: string; joined: number; cancelled: number; total: number }
interface Funnel { total: number; photo: number; socials: number; address: number; saidHi: number; applied: number }
interface CampaignRow {
  id: string; title: string; brandName: string | null; status: string;
  likesCount: number; commentsCount: number; applyClicks: number; engagement: number;
}
interface Analytics {
  months: MonthPoint[];
  active7: number;
  active30: number;
  totalMembers: number;
  cancelledTotal: number;
  funnel: Funnel;
  campaigns: CampaignRow[];
}

const card: React.CSSProperties = {
  background: "var(--surface)",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.06)",
  padding: "20px",
};

function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div style={card}>
      <p className="font-montserrat font-bold uppercase" style={{ fontSize: "9px", letterSpacing: "0.10em", color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="font-montserrat font-bold" style={{ fontSize: "28px", color: "var(--text)", marginTop: "6px" }}>{value}</p>
      {hint && (
        <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{hint}</p>
      )}
    </div>
  );
}

// Simple SVG line chart over 12 monthly values
function LineChart({ points, colour }: { points: { label: string; value: number }[]; colour: string }) {
  const W = 760, H = 130, PAD = 10;
  const max = Math.max(1, ...points.map(p => p.value));
  const step = (W - PAD * 2) / Math.max(1, points.length - 1);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${PAD + i * step},${y(p.value)}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <path d={path} fill="none" stroke={colour} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={PAD + i * step} cy={y(p.value)} r={3} fill={colour} />
        ))}
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${points.length}, 1fr)`, marginTop: "6px" }}>
        {points.map((p, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <p className="font-montserrat font-semibold" style={{ fontSize: "10px", color: "var(--text)" }}>{p.value}</p>
            <p className="font-montserrat font-normal uppercase" style={{ fontSize: "8px", letterSpacing: "0.06em", color: "var(--text-muted)" }}>{p.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginTop: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span className="font-montserrat font-medium" style={{ fontSize: "12px", color: "var(--text)" }}>{label}</span>
        <span className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)" }}>{value} · {pct}%</span>
      </div>
      <div style={{ height: "6px", borderRadius: "3px", background: "var(--surface-2)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: "3px" }} />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then(r => r.json())
      .then(d => { if (d.months) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "32px 32px 24px" }}>
        <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--text-muted)" }}>
          Analytics
        </p>
        <h1 className="admin-title" style={{ fontSize: "32px", marginTop: "4px" }}>Community Analytics</h1>
      </div>

      {loading && (
        <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", padding: "0 32px" }}>
          Loading analytics...
        </p>
      )}

      {!loading && !data && (
        <p className="font-montserrat font-normal" style={{ fontSize: "13px", color: "var(--text-muted)", padding: "0 32px" }}>
          Could not load analytics — please refresh.
        </p>
      )}

      {data && (
        <div style={{ padding: "0 32px 32px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Stat tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            <StatTile label="Members" value={data.totalMembers} />
            <StatTile label="Active This Week" value={data.active7} hint="opened the app in the last 7 days" />
            <StatTile label="Active This Month" value={data.active30} hint="opened the app in the last 30 days" />
            <StatTile label="Cancellations Tracked" value={data.cancelledTotal} hint="since cancellation tracking began" />
          </div>

          {/* Growth chart */}
          <div style={card}>
            <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.10em", color: "var(--text-muted)", marginBottom: "14px" }}>
              Member Growth — total members, last 12 months
            </p>
            <LineChart points={data.months.map(m => ({ label: m.label, value: m.total }))} colour="var(--accent)" />
          </div>

          {/* Joins vs cancellations */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={card}>
              <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.10em", color: "var(--text-muted)", marginBottom: "14px" }}>
                New Members Per Month
              </p>
              <LineChart points={data.months.map(m => ({ label: m.label, value: m.joined }))} colour="#27AE60" />
            </div>
            <div style={card}>
              <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.10em", color: "var(--text-muted)", marginBottom: "14px" }}>
                Cancellations Per Month
              </p>
              <LineChart points={data.months.map(m => ({ label: m.label, value: m.cancelled }))} colour="#C0392B" />
              <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "10px" }}>
                Counts from when cancellation tracking began (Jul 2026) — earlier cancellations have no date recorded.
              </p>
            </div>
          </div>

          {/* Funnel + campaign engagement */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "16px", alignItems: "start" }}>
            <div style={card}>
              <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.10em", color: "var(--text-muted)" }}>
                Onboarding Checklist Completion
              </p>
              <FunnelBar label="Added a photo" value={data.funnel.photo} total={data.funnel.total} />
              <FunnelBar label="Added socials" value={data.funnel.socials} total={data.funnel.total} />
              <FunnelBar label="Added delivery address" value={data.funnel.address} total={data.funnel.total} />
              <FunnelBar label="Said hi in group chat" value={data.funnel.saidHi} total={data.funnel.total} />
              <FunnelBar label="Applied to an opportunity" value={data.funnel.applied} total={data.funnel.total} />
            </div>

            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.10em", color: "var(--text-muted)", padding: "20px 20px 12px" }}>
                Top Campaigns by Engagement
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "2.4fr 0.7fr 0.7fr 0.9fr", gap: "8px", padding: "0 20px 8px" }}>
                {["Campaign", "Likes", "Comments", "Apply Clicks"].map(col => (
                  <span key={col} className="font-montserrat font-bold uppercase" style={{ fontSize: "9px", letterSpacing: "0.08em", color: "var(--text-muted)" }}>{col}</span>
                ))}
              </div>
              {data.campaigns.length === 0 && (
                <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)", padding: "8px 20px 20px" }}>
                  No campaign engagement yet.
                </p>
              )}
              {data.campaigns.map((c, i) => (
                <div key={c.id} style={{ display: "grid", gridTemplateColumns: "2.4fr 0.7fr 0.7fr 0.9fr", gap: "8px", padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.04)", alignItems: "center", background: i % 2 ? "rgba(255,255,255,0.015)" : "transparent" }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="font-montserrat font-medium" style={{ fontSize: "12px", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</p>
                    <p className="font-montserrat font-normal" style={{ fontSize: "10px", color: "var(--text-muted)" }}>{c.brandName ?? "—"}{c.status === "closed" ? " · closed" : ""}</p>
                  </div>
                  <span className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)" }}>{c.likesCount}</span>
                  <span className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)" }}>{c.commentsCount}</span>
                  <span className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)" }}>{c.applyClicks}</span>
                </div>
              ))}
              <p className="font-montserrat font-normal" style={{ fontSize: "10px", color: "var(--text-muted)", padding: "10px 20px 16px" }}>
                Apply clicks counted from Jul 2026 onwards.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
