"use client";
import { useEffect, useRef, useState } from "react";

type RetrievedDoc = { id: string; source: string; title: string | null; content: string; similarity: number };
type AskResult = {
  question: string;
  rewritten: string | null;
  answer: string;
  grade: "pass" | "fail" | "give_up";
  retrieved: RetrievedDoc[];
  retry_count: number;
  elapsed_ms: number;
};

type Entry = { q: string; r?: AskResult; loading?: boolean; error?: string };

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Entry[]>([]);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<string | null>(null);
  const [status, setStatus] = useState<{ total: number; per_source: { source: string; count: number }[] | null } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function loadStatus() {
    try {
      const r = await fetch("/api/rag/status");
      if (r.ok) setStatus(await r.json());
    } catch {}
  }

  useEffect(() => { loadStatus(); }, []);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [history]);

  async function ask() {
    const q = question.trim();
    if (!q) return;
    setQuestion("");
    const idx = history.length;
    setHistory((h) => [...h, { q, loading: true }]);
    try {
      const r = await fetch("/api/rag/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "שגיאה");
      setHistory((h) => h.map((e, i) => i === idx ? { q, r: j } : e));
    } catch (err: any) {
      setHistory((h) => h.map((e, i) => i === idx ? { q, error: err.message } : e));
    }
  }

  async function runIngest() {
    if (!confirm("לעדכן את בסיס הידע? הפעולה תיקח כמה דקות.")) return;
    setIngesting(true);
    setIngestResult(null);
    try {
      const r = await fetch("/api/rag/ingest", { method: "POST", headers: { "Content-Type": "application/json" } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "שגיאה");
      setIngestResult(`✓ הוזנו ${j.embedded}/${j.chunks} קטעים מ-${j.sources} מקורות (${Math.round(j.elapsed_ms / 1000)}s). ${j.errors} שגיאות.`);
      loadStatus();
    } catch (err: any) {
      setIngestResult(`✗ ${err.message}`);
    } finally {
      setIngesting(false);
    }
  }

  const gradeBadge = (g: string) => {
    if (g === "pass") return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">✓ נתמך במסמכים</span>;
    if (g === "give_up") return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">⚠️ אין מידע מספיק</span>;
    return <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800">⚠ לא נתמך במלואו</span>;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">🔍 שאל את המערכת</h1>
          <p className="text-sm text-gray-600 mt-1">שואל שאלות בשפה חופשית על אירועים, מלונות, טיסות, FAQ ונהלי החברה.</p>
        </div>
        <div className="text-xs text-gray-600 flex items-center gap-2">
          <span>{status ? `${status.total} קטעים במאגר` : "טוען..."}</span>
          <button onClick={runIngest} disabled={ingesting} className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50 text-xs">
            {ingesting ? "מעדכן..." : "עדכן מאגר ידע"}
          </button>
        </div>
      </div>
      {ingestResult && <div className="mb-4 text-sm p-3 rounded bg-gray-50 border">{ingestResult}</div>}
      {status?.per_source && (
        <div className="mb-4 flex flex-wrap gap-2">
          {status.per_source.map((s) => (
            <span key={s.source} className="text-xs px-2 py-1 rounded bg-gray-100">
              {s.source}: {s.count}
            </span>
          ))}
        </div>
      )}

      <div ref={listRef} className="space-y-4 mb-4 max-h-[60vh] overflow-y-auto">
        {history.length === 0 && (
          <div className="text-gray-500 text-sm p-6 text-center border-2 border-dashed rounded-lg">
            דוגמאות לשאלות:<br />
            • באיזה יעדים יש לנו אירועים?<br />
            • מה הגיל המינימלי לאירועים שלנו?<br />
            • מה מדיניות הביטולים?<br />
            • איזה מלונות יש בלונדון?
          </div>
        )}
        {history.map((e, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-end">
              <div className="bg-blue-600 text-white rounded-2xl rounded-tl-sm px-4 py-2 max-w-[85%] text-sm">{e.q}</div>
            </div>
            {e.loading && (
              <div className="text-sm text-gray-500 animate-pulse">מחפש במסמכים...</div>
            )}
            {e.error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{e.error}</div>}
            {e.r && (
              <div className="bg-gray-50 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[90%] text-sm whitespace-pre-wrap">
                <div className="mb-2">{e.r.answer}</div>
                <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t">
                  {gradeBadge(e.r.grade)}
                  {e.r.retry_count > 0 && (
                    <span className="text-xs text-gray-500">↻ {e.r.retry_count} ניסיונות</span>
                  )}
                  <span className="text-xs text-gray-500">{(e.r.elapsed_ms / 1000).toFixed(1)}s</span>
                </div>
                {e.r.retrieved.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-600 cursor-pointer">מקורות ({e.r.retrieved.length})</summary>
                    <div className="mt-2 space-y-1 text-xs">
                      {e.r.retrieved.map((d, di) => (
                        <div key={d.id} className="p-2 bg-white rounded border">
                          <div className="font-semibold">[{di + 1}] {d.source} · {d.title || "—"}</div>
                          <div className="text-gray-600 mt-1">{d.content.slice(0, 300)}{d.content.length > 300 ? "..." : ""}</div>
                          <div className="text-gray-400 mt-1">similarity: {d.similarity.toFixed(3)}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(); }}
        className="sticky bottom-0 bg-white pt-3 pb-1 flex gap-2 border-t"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="שאל כל שאלה על המערכת..."
          className="flex-1 border rounded-xl px-4 py-2 text-sm"
          autoFocus
        />
        <button type="submit" disabled={!question.trim()} className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50 text-sm">
          שלח
        </button>
      </form>
    </div>
  );
}
