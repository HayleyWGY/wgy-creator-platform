"use client";

import { Home, Briefcase, Users, BookOpen, User, LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";

const NAV_ICONS: Record<string, LucideIcon> = {
  "/home":          Home,
  "/opportunities": Briefcase,
  "/community":     Users,
  "/learn":         BookOpen,
  "/profile":       User,
};

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 z-50 flex items-center justify-around"
      style={{
        background: "#1c1c1c",
        borderTop: "1px solid rgba(255, 255, 255, 0.06)",
        height: "80px",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "390px",
      }}
    >
      {NAV_ITEMS.map(({ label, href }) => {
        const Icon = NAV_ICONS[href];
        const isActive =
          pathname === href ||
          (href !== "/home" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 flex-1 py-3"
          >
            <Icon
              size={22}
              strokeWidth={1.5}
              color={isActive ? "#e4dcd1" : "#4a4a4a"}
            />
            <span
              className="font-montserrat font-medium"
              style={{
                fontSize: "9px",
                letterSpacing: "0.04em",
                color: isActive ? "#e4dcd1" : "#4a4a4a",
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
