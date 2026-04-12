import AdminSidebar from "@/components/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <AdminSidebar />
      <main className="md:mr-60 min-h-screen p-4 md:p-6 pb-20 md:pb-6">
        {children}
      </main>
    </div>
  );
}
