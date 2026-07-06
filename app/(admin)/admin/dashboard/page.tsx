"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  MessageSquare,
  LucideIcon,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

interface AdminStats {
  totalCreators: number;
  activeSubscriptions: number;
  joinedThisMonth: number;
  monthlyGrowth: { label: string; count: number }[];
  recentCampaigns: { id: string; name: string; section: string; status: string }[];
}

// Decorative accent dots for the campaigns list (cycled)
const DOT_COLOURS = ["#e4a0a0", "#a0c4e4", "#a0e4b0", "#c4a0e4", "#e4dcd1", "#c9b48f"];

// Map 12 monthly cumulative counts onto the chart viewBox (760×110,
// y inverted, 10 top padding / 100 baseline)
function buildChartPoints(growth: { count: number }[]): string {
  if (growth.length === 0) return "";
  const max = Math.max(...growth.map(g => g.count), 1);
  const min = Math.min(...growth.map(g => g.count));
  const range = Math.max(max - min, 1);
  const stepX = 759 / Math.max(growth.length - 1, 1);
  return growth
    .map((g, i) => `${Math.round(i * stepX)},${Math.round(100 - ((g.count - min) / range) * 90)}`)
    .join(" ");
}

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
  const [stats, setStats] = useState<AdminStats | null>(null)

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

    // Real dashboard stats: members, subscriptions, growth, campaigns
    fetch('/api/admin/stats')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setStats(d) })
      .catch(() => {})
  }, [])

  const statCards = [
    {
      label: 'Total Creators',
      value: stats ? stats.totalCreators.toLocaleString() : '—',
      trend: stats ? `+${stats.joinedThisMonth} this month` : '',
      accentBorder: false,
      accentNumber: false,
    },
    {
      label: 'Active Subscriptions',
      value: stats ? stats.activeSubscriptions.toLocaleString() : '—',
      trend: stats && stats.totalCreators > 0
        ? `${Math.round((stats.activeSubscriptions / stats.totalCreators) * 100)}% of members`
        : '',
      accentBorder: false,
      accentNumber: false,
    },
    {
      label: 'Unread DMs',
      value: unreadDms !== null ? String(unreadDms) : '—',
      trend: 'From creators',
      accentBorder: true,
      accentNumber: true,
    },
  ]

  const chartPoints = stats ? buildChartPoints(stats.monthlyGrowth) : ''
  const chartFill = chartPoints ? `${chartPoints} 759,110 0,110` : ''
  const chartLabels = stats ? stats.monthlyGrowth.map(g => g.label) : []
  const recentCampaigns = stats?.recentCampaigns ?? []

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
            {chartFill && (
              <polygon
                points={chartFill}
                fill="rgba(228,220,209,0.08)"
              />
            )}
            {/* Line */}
            {chartPoints && (
              <polyline
                points={chartPoints}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
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
            {chartLabels.map((label, i) => (
              <span
                key={`${label}-${i}`}
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
          {stats
            ? `${stats.totalCreators.toLocaleString()} total members · ${stats.joinedThisMonth} new this month`
            : 'Loading…'}
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
            {recentCampaigns.length === 0 && (
              <p className="font-montserrat" style={{ fontSize: "12px", color: "var(--text-muted)", padding: "16px 0" }}>
                {stats ? 'No campaigns yet' : 'Loading…'}
              </p>
            )}
            {recentCampaigns.map((c, i) => (
              <div key={c.id}>
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
                      background: DOT_COLOURS[i % DOT_COLOURS.length],
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
                {i < recentCampaigns.length - 1 && (
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
