"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  MessageSquare,
  LucideIcon,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

const STAT_CARDS = [
  {
    label: "Total Creators",
    value: "—",
    trend: "",
    accentBorder: false,
    accentNumber: false,
  },
  {
    label: "Active Subscriptions",
    value: "—",
    trend: "",
    accentBorder: false,
    accentNumber: false,
  },
  {
    label: "Unread DMs",
    value: "—",
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

interface ActivityItem {
  icon: LucideIcon;
  title: string;
  sub: string;
  time: string;
  iconColour?: string;
  createdAt: string;
}

function getAge(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function StatusPill({ status }: { status: string }) {
  if (status === "LIVE") {
    return (
      <span
        className="font-montserrat font-semibold uppercase"
        style={{ fontSize: "9px", letterSpacing: "0.10em", background: "var(--accent)", color: "var(--bg)", padding: "3px 8px", borderRadius: "20px" }}
      >
        Live
      </span>
    );
  }
  if (status === "DRAFT") {
    return (
      <span
        className="font-montserrat font-semibold uppercase"
        style={{ fontSize: "9px", letterSpacing: "0.10em", background: "transparent", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.15)", padding: "3px 8px", borderRadius: "20px" }}
      >
        Draft
      </span>
    );
  }
  return (
    <span
      className="font-montserrat font-semibold uppercase"
      style={{ fontSize: "9px", letterSpacing: "0.10em", background: "var(--surface-2)", color: "var(--text-muted)", padding: "3px 8px", borderRadius: "20px" }}
    >
      Closed
    </span>
  );
}

export default function DashboardPage() {
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [unreadDms, setUnreadDms] = useState<number | null>(null)

  useEffect(() => {
    // Fetch DM threads for unread count + recent DM activity
    fetch('/api/chat/dm/admin')
      .then(r => r.json())
      .then(data => {
        const threads = (data.threads || []) as {
          creator: { firstName: string; lastName: string }
          unreadCount: number
          messages: { createdAt: string; sender?: { isAdmin?: boolean } }[]
        }[]
        const totalUnread = threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0)
        setUnreadDms(totalUnread)

        const dmItems: ActivityItem[] = threads
          .filter(t => t.messages?.[0])
          .map(t => {
            const msg = t.messages[0]
            const fromCreator = !msg.sender?.isAdmin
            return {
              icon: MessageSquare,
              title: fromCreator ? 'New DM received' : 'You replied to a DM',
              sub: `${t.creator.firstName} ${t.creator.lastName}`,
              time: getAge(msg.createdAt),
              createdAt: msg.createdAt,
            }
          })

        // Fetch creator posts for post activity
        fetch('/api/creator-posts?limit=5')
          .then(r => r.json())
          .then(postData => {
            const posts = (postData.posts || []) as {
              author: { firstName: string; lastName: string }
              body: string
              createdAt: string
            }[]
            const postItems: ActivityItem[] = posts.map(p => ({
              icon: FileText,
              title: 'New Creator Corner post',
              sub: `${p.author.firstName} ${p.author.lastName} — "${p.body.slice(0, 40)}${p.body.length > 40 ? '…' : ''}"`,
              time: getAge(p.createdAt),
              createdAt: p.createdAt,
            }))

            const combined = [...dmItems, ...postItems]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 6)

            setActivity(combined)
          })
          .catch(() => {})
      })
      .catch(() => {})
  }, [])

  const statCards = STAT_CARDS.map(card => {
    if (card.label === 'Unread DMs') return { ...card, value: unreadDms !== null ? String(unreadDms) : '—' }
    return card
  })

  return (
    <div style={{ padding: "32px" }}>
      {/* Header */}
      <AdminPageHeader eyebrow="Overview" title="Welcome back," accent="Hayley" subtitle="Here's what's happening today." />

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          marginTop: "24px",
        }}
      >
        {statCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-card)",
              padding: "20px",
              border: "1px solid var(--border)",
              borderLeft: card.accentBorder ? "3px solid var(--accent)" : "1px solid var(--border)",
            }}
          >
            <p
              className="font-montserrat font-bold uppercase"
              style={{ fontSize: "9px", letterSpacing: "0.12em", color: "var(--text-muted)" }}
            >
              {card.label}
            </p>
            <p
              className="font-montserrat"
              style={{ fontSize: "40px", fontWeight: 900, letterSpacing: "-0.04em", color: card.accentNumber ? "var(--accent)" : "var(--text)", marginTop: "8px", lineHeight: 1 }}
            >
              {card.value}
            </p>
            <p
              className="font-montserrat font-normal"
              style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}
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
          background: "var(--surface)",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="text-section-label">Member Growth</span>
          <span className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
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
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* End dot */}
            <circle cx="759" cy="10" r="3" fill="var(--accent)" />
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
                style={{ fontSize: "9px", color: "var(--text-muted)" }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <p
          className="font-montserrat font-normal text-center"
          style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "12px" }}
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
        <div style={{ background: "var(--surface)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="text-section-label">Recent Campaigns</span>
            <Link
              href="/admin/campaigns"
              className="font-montserrat font-semibold"
              style={{ fontSize: "11px", color: "var(--accent)", textDecoration: "none" }}
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
                    style={{ fontSize: "13px", color: "var(--text)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {c.name}
                  </p>
                  <p
                    className="font-montserrat font-normal"
                    style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}
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
              color: "var(--accent)",
              textDecoration: "none",
            }}
          >
            <span className="font-montserrat font-semibold" style={{ fontSize: "12px" }}>
              + New Campaign
            </span>
          </Link>
        </div>

        {/* Recent Activity */}
        <div style={{ background: "var(--surface)", borderRadius: "12px", padding: "20px" }}>
          <span className="text-section-label">Recent Activity</span>

          <div style={{ marginTop: "8px" }}>
            {activity.length === 0 && (
              <p className="font-montserrat" style={{ fontSize: "12px", color: "var(--text-muted)", padding: "16px 0" }}>
                No recent activity
              </p>
            )}
            {activity.map((item, i) => {
              const Icon = item.icon;
              const colour = item.iconColour ?? "var(--accent)";
              return (
                <div
                  key={i}
                  style={{
                    padding: "10px 0",
                    display: "flex",
                    gap: "10px",
                    borderBottom: i < activity.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "var(--surface-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={14} color={colour} strokeWidth={1.5} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="font-montserrat font-medium" style={{ fontSize: "12px", color: "var(--text)" }}>
                      {item.title}
                    </p>
                    <p className="font-montserrat font-normal" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {item.sub}
                    </p>
                  </div>
                  <span className="font-montserrat font-normal" style={{ fontSize: "10px", color: "var(--text-muted)", flexShrink: 0 }}>
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
