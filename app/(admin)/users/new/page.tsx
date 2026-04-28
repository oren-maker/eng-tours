"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type MarketingPage = { id: string; title: string; slug: string };

export default function NewUserPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState<MarketingPage[]>([]);
  const [form, setForm] = useState({
    display_name: "",
    email: "",
    phone: "",
    whatsapp_number: "",
    password: "",
    role: "admin" as "admin" | "supplier" | "page_admin",
    marketing_page_id: "" as string,
  });

  useEffect(() => {
    fetch("/api/admin/marketing/pages", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPages(d.pages || []))
      .catch(() => {});
  }, []);

  // Only primary admin can access
  if (session && !session.user?.is_primary_admin) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
        <div className="text-4xl mb-3">🔒</div>
        <div className="text-lg">אין לך הרשאה לצפות בדף זה</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (form.role === "page_admin" && !form.marketing_page_id) {
        alert("בחר עמוד שיווק עבור משתמש מסוג 'אדמין עמוד'");
        setSaving(false);
        return;
      }
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: form.display_name,
          email: form.email,
          phone: form.phone || undefined,
          whatsapp_number: form.whatsapp_number || undefined,
          password: form.password,
          role: form.role,
          marketing_page_id: form.role === "page_admin" ? form.marketing_page_id : null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("משתמש נוצר בהצלחה!");
        router.push("/users");
      } else {
        alert(data.error || "שגיאה ביצירת משתמש");
      }
    } catch {
      alert("שגיאה ביצירת משתמש");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-900 mb-6">משתמש חדש</h2>

      <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שם תצוגה <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => updateField("display_name", e.target.value)}
              placeholder="שם מלא"
              className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              מייל <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="email@example.com"
              className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">טלפון / WhatsApp</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => {
                updateField("phone", e.target.value);
                updateField("whatsapp_number", e.target.value);
              }}
              placeholder="0524802830"
              autoComplete="off"
              className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              dir="ltr"
            />
            <p className="text-xs text-gray-400 mt-1">המספר ישמש גם ל-WhatsApp</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              סיסמה <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              placeholder="לפחות 6 תווים"
              className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
              minLength={6}
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תפקיד <span className="text-red-500">*</span>
            </label>
            <select
              value={form.role}
              onChange={(e) => updateField("role", e.target.value)}
              className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="admin">מנהל מערכת (גישה מלאה)</option>
              <option value="page_admin">📄 אדמין עמוד שיווק (גישה לעמוד אחד בלבד)</option>
              <option value="supplier">ספק</option>
            </select>
          </div>

          {form.role === "page_admin" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                עמוד שיווק <span className="text-red-500">*</span>
              </label>
              <select
                value={form.marketing_page_id}
                onChange={(e) => updateField("marketing_page_id", e.target.value)}
                className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">— בחר עמוד —</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>{p.title} ({p.slug})</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">המשתמש יוכל לראות רק את העמוד הזה — דשבורד, לידים, קישורי מעקב ועריכה.</p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {saving ? "יוצר..." : "צור משתמש"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/users")}
              className="px-6 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
