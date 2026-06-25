import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Admin inherits the new DARK tokens only — pinned to dark regardless of the
  // global theme, and intentionally has no light/dark toggle in this pass.
  return (
    <div data-theme="dark" style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <AdminSidebar />
      <main style={{ flex: 1, background: "var(--bg)", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
