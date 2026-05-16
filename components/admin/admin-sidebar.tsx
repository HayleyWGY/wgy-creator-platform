"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Megaphone,
  CheckSquare,
  Inbox,
  Users,
  Tag,
  MessageSquare,
  Layers,
  ListOrdered,
  BookOpen,
  BarChart2,
  Settings,
  LogOut,
  MessageCircle,
  LucideIcon,
} from "lucide-react";

const NAV_ITEMS: { label: string; icon: LucideIcon; href: string }[] = [
  { label: "Dashboard",  icon: LayoutDashboard, href: "/admin/dashboard"  },
  { label: "Campaigns",  icon: Megaphone,       href: "/admin/campaigns"  },
  { label: "Approvals",  icon: CheckSquare,     href: "/admin/approvals"  },
  { label: "Community",  icon: MessageCircle,   href: "/admin/community"  },
  { label: "Inbox",      icon: Inbox,           href: "/admin/inbox"      },
  { label: "Creators",   icon: Users,           href: "/admin/creators"   },
  { label: "Tags",       icon: Tag,             href: "/admin/tags"       },
  { label: "Mass DM",    icon: MessageSquare,   href: "/admin/mass-dm"    },
  { label: "Sequences",  icon: Layers,          href: "/admin/sequences"  },
  { label: "Workflows",  icon: ListOrdered,     href: "/admin/workflows"  },
  { label: "Content",    icon: BookOpen,        href: "/admin/content"    },
  { label: "Analytics",  icon: BarChart2,       href: "/admin/analytics"  },
  { label: "Settings",   icon: Settings,        href: "/admin/settings"   },
];

export function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin/dashboard") return pathname === "/admin/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <aside
      style={{
        width: "240px",
        flexShrink: 0,
        background: "#1a1a1a",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}
    >
      {/* Logo + portal label */}
      <div style={{ padding: "24px 20px 20px", flexShrink: 0 }}>
        <Image
          src="/images/wgy-logo-white.png"
          alt="WGY"
          width={72}
          height={30}
          style={{ objectFit: "contain", objectPosition: "left", display: "block" }}
        />
        <p
          className="font-montserrat font-bold uppercase"
          style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#706b6b", marginTop: "4px" }}
        >
          Internal Portal
        </p>
      </div>

      {/* Nav items */}
      <nav style={{ padding: "12px 0", flex: 1 }}>
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 16px",
                margin: "2px 8px",
                borderRadius: "8px",
                textDecoration: "none",
                background: active ? "rgba(228,220,209,0.1)" : "transparent",
                color: active ? "#e4dcd1" : "#706b6b",
                transition: "color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!active)
                  (e.currentTarget as HTMLAnchorElement).style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                if (!active)
                  (e.currentTarget as HTMLAnchorElement).style.color = "#706b6b";
              }}
            >
              <Icon size={16} strokeWidth={1.5} />
              <span className="font-montserrat font-medium" style={{ fontSize: "13px" }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Admin user */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "#e4dcd1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span className="font-montserrat font-bold" style={{ fontSize: "9px", color: "#222222" }}>
            HW
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="font-montserrat font-medium" style={{ fontSize: "12px", color: "#ffffff" }}>
            Hayley W
          </p>
          <p className="font-montserrat font-normal" style={{ fontSize: "10px", color: "#706b6b" }}>
            Admin
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          title="Sign out"
        >
          <LogOut size={16} color="#706b6b" strokeWidth={1.5} />
        </button>
      </div>
    </aside>
  );
}
