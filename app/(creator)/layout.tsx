import { BottomNav } from "@/components/creator/bottom-nav";
import { NavHeader } from "@/components/creator/NavHeader";
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
          {/* Logo — rendered via CSS mask so it fills with the theme text
              token (dark on light, white on dark) from the single white asset,
              with no brightness-filter hack and no second asset to maintain. */}
          <span className="wgy-logo" role="img" aria-label="WGY" style={{ height: "24px", width: "60px", display: "block" }} />

          {/* Right icons — real unread badges */}
          <div className="flex items-center gap-3">
            <NavHeader />
            <button aria-label="Search">
              <Search size={20} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />
            </button>
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
