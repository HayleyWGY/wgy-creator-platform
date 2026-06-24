import { BottomNav } from "@/components/creator/bottom-nav";
import { NavHeader } from "@/components/creator/NavHeader";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Search } from "lucide-react";

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-[390px] mx-auto relative min-h-screen flex flex-col">

        {/* Global sticky header */}
        <header
          className="sticky top-0 z-50 flex items-center justify-between px-5 flex-shrink-0"
          style={{
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            height: "56px",
          }}
        >
          {/* Logo (white asset; auto-inverts in light theme via .wgy-logo filter).
              TODO(pre-launch): replace the CSS filter-inverted logo with a proper
              light-theme logo asset and swap by theme. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/wgy-logo-white.png"
            alt="WGY"
            className="wgy-logo"
            style={{ height: "24px", width: "auto", display: "block" }}
          />

          {/* Right icons — real unread badges + theme toggle */}
          <div className="flex items-center gap-3">
            <NavHeader />
            <button aria-label="Search">
              <Search size={20} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />
            </button>
            <ThemeToggle compact />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ paddingBottom: "80px" }}>
          {children}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
