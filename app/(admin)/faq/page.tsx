"use client";

import BackToSettings from "@/components/back-to-settings";
import { useState, useEffect } from "react";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  helpful_yes: number;
  helpful_no: number;
  created_at: string;
}

export default function FaqPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/faq?all=true");
      if (res.ok) {
        const data = await res.json();
        setFaqs(data.faqs || []);
      }
    } catch (err) {
      console.error("Failed to fetch FAQs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);

    try {
      if (editingId) {
        const res = await fetch(`/api/faq/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, answer }),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || "שגיאה בעדכון");
          return;
        }
      } else {
        const res = await fetch("/api/faq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            answer,
            sort_order: faqs.length + 1,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || "שגיאה בהוספה");
          return;
        }
      }

      resetForm();
      fetchFaqs();
    } catch {
      alert("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (faq: FaqItem) => {
    setEditingId(faq.id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("האם למחוק שאלה זו?")) return;
    try {
      const res = await fetch(`/api/faq/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchFaqs();
      } else {
        alert("שגיאה במחיקה");
      }
    } catch {
      alert("שגיאה במחיקה");
    }
  };

  const handleToggleActive = async (faq: FaqItem) => {
    try {
      const res = await fetch(`/api/faq/${faq.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !faq.is_active }),
      });
      if (res.ok) {
        fetchFaqs();
      }
    } catch {
      alert("שגיאה בעדכון");
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setQuestion("");
    setAnswer("");
  };

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;

    const newFaqs = [...faqs];
    const [dragged] = newFaqs.splice(draggedIdx, 1);
    newFaqs.splice(idx, 0, dragged);
    setFaqs(newFaqs);
    setDraggedIdx(idx);
  };

  const handleDragEnd = async () => {
    setDraggedIdx(null);
    // Save new order
    for (let i = 0; i < faqs.length; i++) {
      if (faqs[i].sort_order !== i + 1) {
        await fetch(`/api/faq/${faqs[i].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: i + 1 }),
        });
      }
    }
  };

  return (
    <>
      <BackToSettings />
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-primary-900">ניהול שאלות נפוצות</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {previewMode ? "מצב ניהול" : "תצוגה מקדימה"}
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            + שאלה חדשה
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingId ? "עריכת שאלה" : "שאלה חדשה"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שאלה</label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="הקלד את השאלה..."
                className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תשובה</label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="הקלד את התשובה..."
                rows={4}
                className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {saving ? "שומר..." : editingId ? "עדכן" : "הוסף"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preview Mode - Accordion */}
      {previewMode && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">תצוגה מקדימה</h3>
          <div className="space-y-2">
            {faqs
              .filter((f) => f.is_active)
              .map((faq) => (
                <div key={faq.id} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedPreview(expandedPreview === faq.id ? null : faq.id)
                    }
                    className="w-full flex items-center justify-between px-4 py-3 text-right bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-medium text-gray-800">{faq.question}</span>
                    <span className="text-gray-400 mr-2">
                      {expandedPreview === faq.id ? "▲" : "▼"}
                    </span>
                  </button>
                  {expandedPreview === faq.id && (
                    <div className="px-4 py-3 text-sm text-gray-600 border-t bg-white">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* FAQ List */}
      {!previewMode && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 w-8"></th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">סדר</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">שאלה</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">סטטוס</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">מועיל</th>
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
                ) : faqs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      אין שאלות נפוצות. הוסף שאלה חדשה.
                    </td>
                  </tr>
                ) : (
                  faqs.map((faq, idx) => (
                    <tr
                      key={faq.id}
                      className="border-b last:border-0 hover:bg-gray-50"
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                    >
                      <td className="px-4 py-3 cursor-grab text-gray-400">⠿</td>
                      <td className="px-4 py-3 text-gray-500">{faq.sort_order}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{faq.question}</div>
                        <div className="text-xs text-gray-400 mt-1 line-clamp-1">
                          {faq.answer}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(faq)}
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${
                            faq.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {faq.is_active ? "פעיל" : "לא פעיל"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-green-600 text-xs">
                          👍 {faq.helpful_yes || 0}
                        </span>
                        <span className="text-red-600 text-xs mr-2">
                          👎 {faq.helpful_no || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(faq)}
                            className="text-primary-700 hover:text-primary-900 text-xs font-medium"
                          >
                            עריכה
                          </button>
                          <button
                            onClick={() => handleDelete(faq.id)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                          >
                            מחיקה
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
