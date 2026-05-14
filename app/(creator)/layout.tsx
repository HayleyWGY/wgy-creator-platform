import { BottomNav } from "@/components/creator/bottom-nav";
import { Bell, Search, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#222222]">
      <div className="max-w-[390px] mx-auto relative min-h-screen flex flex-col">

        {/* Global sticky header */}
        <header
          className="sticky top-0 z-50 flex items-center justify-between px-5 flex-shrink-0"
          style={{
            background: "#1c1c1c",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            height: "56px",
          }}
        >
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/wgy-logo-white.png"
            alt="WGY"
            style={{ height: "24px", width: "auto", display: "block" }}
          />

          {/* Right icons */}
          <div className="flex items-center gap-4">
            {/* Messages */}
            <Link href="/messages" className="relative">
              <MessageCircle size={20} color="#706b6b" strokeWidth={1.5} />
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                style={{ background: "#e4dcd1" }}
              />
            </Link>
            {/* Bell → Notifications */}
            <Link href="/notifications" className="relative">
              <Bell size={20} color="#706b6b" strokeWidth={1.5} />
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                style={{ background: "#e4dcd1" }}
              />
            </Link>
            {/* Search */}
            <button>
              <Search size={20} color="#706b6b" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: "80px" }}
        >
          {children}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
