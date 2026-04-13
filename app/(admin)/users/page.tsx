"use client";

import BackToSettings from "@/components/back-to-settings";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface User {
  id: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  is_archived?: boolean;
  is_primary_admin: boolean;
  phone: string | null;
  created_at: string;
}

const ROLE_BADGES: Record<string, string> = {
  admin: "bg-blue-100 text-blue-800",
  supplier: "bg-purple-100 text-purple-800",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "מנהל",
  supplier: "ספק",
};

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (user: User) => {
    if (user.is_primary_admin) return;
    if (!confirm(`האם ${user.is_archived ? "לשחזר" : "להעביר לארכיון"} את ${user.display_name}?`)) return;
    try {
      const res = await fetch(`/api/auth/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: !user.is_archived }),
      });
      if (res.ok) fetchUsers();
      else {
        const d = await res.json();
        alert(d.error || "שגיאה");
      }
    } catch {
      alert("שגיאה");
    }
  };

  const handleToggleActive = async (user: User) => {
    if (user.is_primary_admin) return;
    if (!confirm(`האם ${user.is_active ? "להשבית" : "להפעיל"} את המשתמש ${user.display_name}?`))
      return;

    try {
      const res = await fetch(`/api/auth/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "שגיאה בעדכון");
      }
    } catch {
      alert("שגיאה בעדכון");
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const isPrimaryAdmin = session?.user?.is_primary_admin;
  const isAdmin = session?.user?.role === "admin";

  const visibleUsers = users.filter((u) => showArchived ? u.is_archived : !u.is_archived);

  return (
    <>
      <BackToSettings />
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-primary-900">ניהול משתמשים</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 text-sm rounded-lg border ${showArchived ? "bg-gray-700 text-white border-gray-700" : "bg-white text-gray-700 border-gray-300"}`}
          >
            {showArchived ? "👁 מציג: ארכיון" : "📦 הצג ארכיון"}
          </button>
          {isPrimaryAdmin && (
            <Link href="/users/new" className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              + משתמש חדש
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">שם</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">מייל</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">תפקיד</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">סטטוס</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">תאריך יצירה</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    טוען...
                  </td>
                </tr>
              ) : visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    {showArchived ? "אין משתמשים בארכיון" : "אין משתמשים"}
                  </td>
                </tr>
              ) : (
                visibleUsers.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">
                        {user.display_name}
                        {user.is_primary_admin && (
                          <span className="text-xs text-yellow-600 mr-1">(ראשי)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                          ROLE_BADGES[user.role] || "bg-gray-100"
                        }`}
                      >
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.is_active ? "פעיל" : "מושבת"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3">
                      {!user.is_primary_admin && isAdmin && (
                        <div className="flex gap-2 flex-wrap items-center">
                          <button onClick={() => setEditingUser(user)} className="text-xs text-primary-700 hover:text-primary-900">
                            ✏️ ערוך
                          </button>
                          <button onClick={() => setResetPasswordUser(user)} className="text-xs text-blue-600 hover:text-blue-800">
                            🔐 סיסמה
                          </button>
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`text-xs font-medium ${user.is_active ? "text-red-600 hover:text-red-800" : "text-green-600 hover:text-green-800"}`}
                          >
                            {user.is_active ? "השבת" : "הפעל"}
                          </button>
                          <button onClick={() => handleArchive(user)} className="text-xs text-gray-600 hover:text-gray-800">
                            {user.is_archived ? "♻️ שחזר" : "📦 ארכיון"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSaved={() => { setEditingUser(null); fetchUsers(); }} />
      )}

      {resetPasswordUser && (
        <ResetPasswordModal user={resetPasswordUser} onClose={() => setResetPasswordUser(null)} onSaved={() => setResetPasswordUser(null)} />
      )}
    </div>
    </>
  );
}

function EditUserModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    display_name: user.display_name || "",
    email: user.email || "",
    phone: user.phone || "",
    role: user.role,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/auth/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) onSaved();
      else { const d = await res.json(); alert(d.error || "שגיאה"); }
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">✏️ עריכת משתמש</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">שם לתצוגה</label>
            <input type="text" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">מייל</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">טלפון</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">תפקיד</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="admin">מנהל</option>
              <option value="supplier">ספק</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg">ביטול</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-primary-700 text-white rounded-lg hover:bg-primary-800 disabled:opacity-50">
            {saving ? "שומר..." : "💾 שמור"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => void }) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (password.length < 6) { alert("סיסמה חייבת להיות לפחות 6 תווים"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/auth/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) { alert("הסיסמה שונתה בהצלחה"); onSaved(); }
      else { const d = await res.json(); alert(d.error || "שגיאה"); }
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">🔐 שינוי סיסמה</h3>
        <p className="text-sm text-gray-500 mb-4">משתמש: <b>{user.display_name}</b> ({user.email})</p>
        <div>
          <label className="block text-xs text-gray-600 mb-1">סיסמה חדשה (מינימום 6 תווים)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr"
            autoFocus placeholder="הזן סיסמה חדשה"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3 text-xs text-yellow-800">
          ⚠️ לא ניתן לצפות בסיסמה הקיימת. שינוי הסיסמה יחליף אותה לחלוטין.
        </div>
        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg">ביטול</button>
          <button onClick={save} disabled={saving || password.length < 6}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? "שומר..." : "🔐 שנה סיסמה"}
          </button>
        </div>
      </div>
    </div>
  );
}
