"use client";

import { useState } from "react";
import { Heart, MessageCircle } from "lucide-react";

// TODO Phase 3: Replace with DB queries — analytics aggregations
const MONTHS = ["Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May"];
const VALUES = [340,380,390,410,440,480,560,680,730,790,830,879];
const MIN_V = 340, MAX_V = 879;

const pts = VALUES.map((v, i) => ({
  x: 40 + i * (720 / 11),
  y: 160 - ((v - MIN_V) / (MAX_V - MIN_V)) * 140,
}));

const polylinePoints = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
const areaPath = [
  `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`,
  ...pts.slice(1).map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`),
  `L ${pts[11].x.toFixed(1)},160`,
  `L ${pts[0].x.toFixed(1)},160`,
  "Z",
].join(" ");

const STATS = [
  { label: "Total Members",        value: "879", trend: "+22 this month",         colour: "var(--text-muted)" },
  { label: "Monthly Active",       value: "694", trend: "83% of members · ↑3.7%", colour: "#27AE60" },
  { label: "New This Month",       value: "22",  trend: "↑120% vs last month",    colour: "#27AE60" },
  { label: "Active Subscriptions", value: "837", trend: "96% retention rate",      colour: "var(--text-muted)" },
  { label: "Payment Failures",     value: "12",  trend: "1.4% of members",         colour: "var(--text-muted)" },
  { label: "Cancelled This Month", value: "3",   trend: "Low churn ↓",             colour: "#27AE60" },
];

const TOP_CAMPAIGNS = [
  { name: "The Inkey List",     likes: 142, comments: 61 },
  { name: "Pixi Beauty",        likes: 104, comments: 35 },
  { name: "Monday Haircare",    likes: 94,  comments: 45 },
  { name: "Maybelline Gifting", likes: 70,  comments: 38 },
  { name: "Kaleidos Makeup",    likes: 75,  comments: 32 },
];

const TOP_CONTENT = [
  { name: "10 Ways to Increase Engagement", likes: 41 },
  { name: "Ultimate Beginners Course",      likes: 33 },
  { name: "Mastering Brand Negotiations",   likes: 26 },
  { name: "2026 Creator Checklist",         likes: 18 },
];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("Last 30 days");

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "32px 32px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--text-muted)" }}>Analytics</p>
          <h1 className="admin-title" style={{ fontSize: "32px", marginTop: "4px" }}>Platform Analytics</h1>
        </div>
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="font-montserrat font-normal"
          style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "0 14px", height: "40px", color: "var(--accent)", fontSize: "12px", outline: "none", cursor: "pointer" }}>
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 3 months</option>
          <option>Last 12 months</option>
        </select>
      </div>

      {/* Stat cards */}
      <div style={{ padding: "24px 32px 0", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {STATS.map((s) => (
          <div key={s.label} style={{ background: "var(--surface)", borderRadius: "12px", padding: "20px 24px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="font-montserrat font-bold uppercase" style={{ fontSize: "9px", letterSpacing: "0.12em", color: "var(--text-muted)" }}>{s.label}</p>
            <p className="admin-title" style={{ fontSize: "40px", lineHeight: 1.1, marginTop: "6px" }}>{s.value}</p>
            <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: s.colour, marginTop: "6px" }}>{s.trend}</p>
          </div>
        ))}
      </div>

      {/* Growth chart */}
      <div style={{ margin: "24px 32px 0", background: "var(--surface)", borderRadius: "12px", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--accent)" }}>Member Growth</p>
          <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>Last 12 months</p>
        </div>
        <svg viewBox="0 0 800 180" width="100%" height="180">
          <path d={areaPath} fill="rgba(228,220,209,0.08)" />
          <polyline points={polylinePoints} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
          {pts.map((p, i) => <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3" fill="var(--accent)" />)}
          {MONTHS.map((m, i) => (
            <text key={m} x={pts[i].x.toFixed(1)} y="175" textAnchor="middle"
              style={{ fontSize: "9px", fill: "var(--text-muted)", fontFamily: "var(--font-montserrat)" }}>{m}</text>
          ))}
        </svg>
        <p className="font-montserrat font-normal" style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", marginTop: "12px" }}>
          879 total members · 83% monthly active · +22 new this month
        </p>
      </div>

      {/* Two column */}
      <div style={{ padding: "24px 32px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Most popular campaigns */}
        <div style={{ background: "var(--surface)", borderRadius: "12px", padding: "20px" }}>
          <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--accent)", marginBottom: "12px" }}>Most Popular Campaigns</p>
          {TOP_CAMPAIGNS.map((c, i) => {
            const total = c.likes + c.comments;
            return (
              <div key={c.name} style={{ padding: "10px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="font-montserrat font-semibold" style={{ fontSize: "12px", color: "var(--text-muted)", width: "16px", textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                <span className="font-montserrat font-medium" style={{ fontSize: "13px", color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                <div style={{ width: "80px", height: "4px", background: "var(--surface-2)", borderRadius: "2px", flexShrink: 0 }}>
                  <div style={{ width: `${Math.round((total / 203) * 80)}px`, height: "100%", background: "var(--accent)", borderRadius: "2px" }} />
                </div>
                <span className="font-montserrat font-normal" style={{ fontSize: "10px", color: "var(--text-muted)", flexShrink: 0, display: "flex", alignItems: "center", gap: "4px" }}>
                  <Heart size={9} /> {c.likes} <MessageCircle size={9} /> {c.comments}
                </span>
              </div>
            );
          })}
        </div>

        {/* Content engagement */}
        <div style={{ background: "var(--surface)", borderRadius: "12px", padding: "20px" }}>
          <p className="font-montserrat font-bold uppercase" style={{ fontSize: "10px", letterSpacing: "0.12em", color: "var(--accent)", marginBottom: "12px" }}>Content Engagement</p>
          {TOP_CONTENT.map((c, i) => (
            <div key={c.name} style={{ padding: "10px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="font-montserrat font-semibold" style={{ fontSize: "12px", color: "var(--text-muted)", width: "16px", textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
              <span className="font-montserrat font-medium" style={{ fontSize: "13px", color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
              <div style={{ width: "80px", height: "4px", background: "var(--surface-2)", borderRadius: "2px", flexShrink: 0 }}>
                <div style={{ width: `${Math.round((c.likes / 41) * 80)}px`, height: "100%", background: "var(--accent)", borderRadius: "2px" }} />
              </div>
              <span className="font-montserrat font-normal" style={{ fontSize: "10px", color: "var(--text-muted)", flexShrink: 0, display: "flex", alignItems: "center", gap: "4px" }}>
                <Heart size={9} /> {c.likes}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
