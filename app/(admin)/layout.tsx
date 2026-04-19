import AdminSidebar from "@/components/admin-sidebar";
import PasswordRotationBanner from "@/components/password-rotation-banner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <AdminSidebar />
      <main className="md:mr-60 min-h-screen pb-20 md:pb-6 overflow-y-auto">
        <PasswordRotationBanner />
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
