import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#222222" }}>
      <AdminSidebar />
      <main style={{ flex: 1, background: "#222222", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
