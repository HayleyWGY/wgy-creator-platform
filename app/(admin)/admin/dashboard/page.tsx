"use client";

import Link from "next/link";
import {
  UserPlus,
  FileText,
  CheckCircle,
  MessageSquare,
  XCircle,
  LucideIcon,
} from "lucide-react";

// TODO Phase 3: Replace all static data with DB queries

const STAT_CARDS = [
  {
    label: "Total Creators",
    value: "1,024",
    trend: "+12 this month",
    accentBorder: false,
    accentNumber: false,
  },
  {
    label: "Active Subscriptions",
    value: "987",
    trend: "96% of members",
    accentBorder: false,
    accentNumber: false,
  },
  {
    label: "Pending Approvals",
    value: "2",
    trend: "Awaiting your review",
    accentBorder: true,
    accentNumber: true,
  },
  {
    label: "Unread DMs",
    value: "7",
    trend: "From creators",
    accentBorder: true,
    accentNumber: true,
  },
];

// Normalised SVG y coords (viewBox 0 0 760 110)
// Data: Jun 340, Jul 380, Aug 390, Sep 410, Oct 440, Nov 480, Dec 560, Jan 680, Feb 730, Mar 790, Apr 830, May 879
// x spaced 0–759 (11 gaps), y mapped 10–100 (inverted, min=340 max=879)
const CHART_POINTS = "0,100 69,93 138,92 207,88 276,83 345,77 414,63 483,43 552,35 621,25 690,18 759,10";
const CHART_FILL = `${CHART_POINTS} 759,110 0,110`;
const CHART_LABELS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];

const RECENT_CAMPAIGNS = [
  { name: "Maybelline Gifting",        section: "PR / Gifted",        status: "LIVE",   colour: "#e4a0a0" },
  { name: "Monday Haircare Gifting",   section: "PR / Gifted",        status: "LIVE",   colour: "#a0c4e4" },
  { name: "The Inkey List",            section: "PR / Gifted",        status: "LIVE",   colour: "#a0e4b0" },
  { name: "Chinese Beauty Event",      section: "Paid Collab",        status: "LIVE",   colour: "#c4a0e4" },
  { name: "New Skincare Range",        section: "PR / Gifted",        status: "DRAFT",  colour: "#555555" },
  { name: "Iconic Bronze TikTok",      section: "TikTok Commission",  status: "CLOSED", colour: "#444444" },
];

const RECENT_ACTIVITY: {
  icon: LucideIcon;
  title: string;
  sub: string;
  time: string;
  iconColour?: string;
}[] = [
  { icon: UserPlus,      title: "New creator joined",      sub: "maya.chen@email.com",            time: "2m ago" },
  { icon: FileText,      title: "Client post submitted",   sub: "Glow Beauty — Summer Range",     time: "1h ago" },
  { icon: CheckCircle,   title: "Post approved",           sub: "FW Beauty Gifting went live",    time: "2h ago" },
  { icon: UserPlus,      title: "New creator joined",      sub: "sophie.james@email.com",         time: "3h ago" },
  { icon: MessageSquare, title: "New DM received",         sub: "Laura Edwards messaged WGY",     time: "5h ago" },
  { icon: XCircle,       title: "Payment failed",          sub: "samantha.johnson@email.com",     time: "1d ago", iconColour: "#C0392B" },
];

function StatusPill({ status }: { status: string }) {
  if (status === "LIVE") {
    return (
      <span
        className="font-montserrat font-semibold uppercase"
        style={{ fontSize: "9px", letterSpacing: "0.10em", background: "#e4dcd1", color: "#222222", padding: "3px 8px", borderRadius: "20px" }}
      >
        Live
      </span>
    );
  }
  if (status === "DRAFT") {
    return (
      <span
        className="font-montserrat font-semibold uppercase"
        style={{ fontSize: "9px", letterSpacing: "0.10em", background: "transparent", color: "#706b6b", border: "1px solid rgba(255,255,255,0.15)", padding: "3px 8px", borderRadius: "20px" }}
      >
        Draft
      </span>
    );
  }
  return (
    <span
      className="font-montserrat font-semibold uppercase"
      style={{ fontSize: "9px", letterSpacing: "0.10em", background: "#333333", color: "#706b6b", padding: "3px 8px", borderRadius: "20px" }}
    >
      Closed
    </span>
  );
}

export default function DashboardPage() {
  return (
    <div style={{ padding: "32px" }}>
      {/* Header */}
      <p
        className="font-montserrat font-bold uppercase"
        style={{ fontSize: "10px", letterSpacing: "0.12em", color: "#706b6b" }}
      >
        Overview
      </p>
      <h1
        className="font-playfair italic font-normal text-white"
        style={{ fontSize: "32px", marginTop: "4px" }}
      >
        Welcome back, Hayley
      </h1>
      <p
        className="font-montserrat font-normal"
        style={{ fontSize: "13px", color: "#706b6b", marginTop: "6px" }}
      >
        Here&apos;s what&apos;s happening today.
      </p>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginTop: "24px",
        }}
      >
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            style={{
              background: "#2a2a2a",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid rgba(255,255,255,0.06)",
              borderLeft: card.accentBorder ? "3px solid #e4dcd1" : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p
              className="font-montserrat font-bold uppercase"
              style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#706b6b" }}
            >
              {card.label}
            </p>
            <p
              className="font-playfair italic font-normal"
              style={{ fontSize: "40px", color: card.accentNumber ? "#e4dcd1" : "#ffffff", marginTop: "8px", lineHeight: 1 }}
            >
              {card.value}
            </p>
            <p
              className="font-montserrat font-normal"
              style={{ fontSize: "11px", color: "#706b6b", marginTop: "6px" }}
            >
              {card.trend}
            </p>
          </div>
        ))}
      </div>

      {/* Member growth chart */}
      <div
        style={{
          marginTop: "24px",
          background: "#2a2a2a",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="text-section-label">Member Growth</span>
          <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b" }}>
            Last 12 months
          </span>
        </div>

        {/* SVG line chart */}
        <div style={{ marginTop: "16px", width: "100%" }}>
          <svg
            viewBox="0 0 760 125"
            preserveAspectRatio="none"
            style={{ width: "100%", height: "120px", display: "block" }}
          >
            {/* Fill area */}
            <polygon
              points={CHART_FILL}
              fill="rgba(228,220,209,0.08)"
            />
            {/* Line */}
            <polyline
              points={CHART_POINTS}
              fill="none"
              stroke="#e4dcd1"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* End dot */}
            <circle cx="759" cy="10" r="3" fill="#e4dcd1" />
          </svg>

          {/* X axis labels */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "4px",
              paddingLeft: "0",
              paddingRight: "0",
            }}
          >
            {CHART_LABELS.map((label) => (
              <span
                key={label}
                className="font-montserrat font-normal"
                style={{ fontSize: "9px", color: "#706b6b" }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <p
          className="font-montserrat font-normal text-center"
          style={{ fontSize: "12px", color: "#706b6b", marginTop: "12px" }}
        >
          879 total members · 83% monthly active · +22 new this month
        </p>
      </div>

      {/* Two column */}
      <div
        style={{
          marginTop: "24px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        {/* Recent Campaigns */}
        <div style={{ background: "#2a2a2a", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="text-section-label">Recent Campaigns</span>
            <Link
              href="/admin/campaigns"
              className="font-montserrat font-semibold"
              style={{ fontSize: "11px", color: "#e4dcd1", textDecoration: "none" }}
            >
              View all →
            </Link>
          </div>

          <div style={{ marginTop: "8px" }}>
            {RECENT_CAMPAIGNS.map((c, i) => (
              <div key={i}>
                <div
                  style={{
                    padding: "12px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: c.colour,
                      flexShrink: 0,
                    }}
                  />
                  <p
                    className="font-montserrat font-medium"
                    style={{ fontSize: "13px", color: "#ffffff", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {c.name}
                  </p>
                  <p
                    className="font-montserrat font-normal"
                    style={{ fontSize: "11px", color: "#706b6b", flexShrink: 0 }}
                  >
                    {c.section}
                  </p>
                  <StatusPill status={c.status} />
                </div>
                {i < RECENT_CAMPAIGNS.length - 1 && (
                  <div style={{ height: "1px", background: "rgba(255,255,255,0.04)" }} />
                )}
              </div>
            ))}
          </div>

          <Link
            href="/admin/campaigns/new"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "12px",
              height: "40px",
              borderRadius: "8px",
              border: "1px solid rgba(228,220,209,0.2)",
              color: "#e4dcd1",
              textDecoration: "none",
            }}
          >
            <span className="font-montserrat font-semibold" style={{ fontSize: "12px" }}>
              + New Campaign
            </span>
          </Link>
        </div>

        {/* Recent Activity */}
        <div style={{ background: "#2a2a2a", borderRadius: "12px", padding: "20px" }}>
          <span className="text-section-label">Recent Activity</span>

          <div style={{ marginTop: "8px" }}>
            {RECENT_ACTIVITY.map((item, i) => {
              const Icon = item.icon;
              const colour = item.iconColour ?? "#e4dcd1";
              return (
                <div
                  key={i}
                  style={{
                    padding: "10px 0",
                    display: "flex",
                    gap: "10px",
                    borderBottom: i < RECENT_ACTIVITY.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "#333333",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={14} color={colour} strokeWidth={1.5} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="font-montserrat font-medium" style={{ fontSize: "12px", color: "#ffffff" }}>
                      {item.title}
                    </p>
                    <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "#706b6b", marginTop: "2px" }}>
                      {item.sub}
                    </p>
                  </div>
                  <span className="font-montserrat font-normal" style={{ fontSize: "10px", color: "#706b6b", flexShrink: 0 }}>
                    {item.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
