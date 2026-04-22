// Self-Healing RAG workflow — TypeScript port of the guide's LangGraph design.
// Nodes: retrieve → generate → grade → (rewrite → retry) → give_up
// State threads through every step; retry_count caps the loop at 2.

import { createServiceClient } from "@/lib/supabase";
import { embed } from "@/lib/rag/embed";
import { chat } from "@/lib/rag/llm";

type RetrievedDoc = {
  id: string;
  source: string;
  title: string | null;
  content: string;
  similarity: number;
};

export type RagResult = {
  question: string;
  rewritten: string | null;
  answer: string;
  grade: "pass" | "fail" | "give_up";
  retrieved: RetrievedDoc[];
  retry_count: number;
  elapsed_ms: number;
};

const MAX_RETRIES = 2;
const TOP_K = 4;

async function retrieve(query: string): Promise<RetrievedDoc[]> {
  const vec = await embed(query);
  if (!vec) return [];
  const sb = createServiceClient();
  // Use pgvector via rpc — cheapest path is a small SQL function, but we can
  // use postgres REST with a `rpc` wrapper. Here we inline via pg protocol by
  // posting to an rpc we'll define, but to avoid adding an RPC we call direct
  // SQL through .rpc on a helper. Simplest: use `rag_match_documents` function.
  const { data, error } = await sb.rpc("rag_match_documents", {
    query_embedding: vec as any,
    match_count: TOP_K,
  });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    id: r.id,
    source: r.source,
    title: r.title,
    content: r.content,
    similarity: r.similarity,
  }));
}

async function generate(question: string, docs: RetrievedDoc[]): Promise<string> {
  if (docs.length === 0) {
    return "אין לי מספיק מידע במסמכים כדי לענות על השאלה הזו.";
  }
  const context = docs
    .map((d, i) => `[קטע ${i + 1} · ${d.source}${d.title ? " · " + d.title : ""}]\n${d.content}`)
    .join("\n\n");
  const system = `אתה עוזר שעונה אך ורק על בסיס הקטעים שיוצגו לך.
חוקים מוחלטים:
1. השתמש אך ורק במידע שמופיע בקטעים. אל תשלים מידע שלא נמצא שם.
2. אם המידע בקטעים לא מספיק — כתוב "אין לי מספיק מידע במסמכים" ואל תמציא.
3. ענה בעברית, קצר ומדויק.
4. כשאפשר, ציין את מספר הקטע שממנו לקחת את המידע (לדוגמה: "לפי קטע 2...").`;
  const user = `קטעים רלוונטיים:\n\n${context}\n\nשאלה: ${question}\n\nתשובה:`;
  return chat([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
}

async function grade(question: string, docs: RetrievedDoc[], answer: string): Promise<"pass" | "fail"> {
  if (docs.length === 0) return "fail";
  const context = docs.map((d, i) => `[קטע ${i + 1}]\n${d.content}`).join("\n\n");
  const system = `אתה בוחן איכות של מערכת RAG. עליך להחזיר בדיוק מילה אחת: "pass" או "fail".
- pass: התשובה נתמכת במלואה בקטעים והיא רלוונטית לשאלה.
- fail: התשובה מכילה מידע שלא מופיע בקטעים, מזויף, או לא רלוונטי.
- גם אם התשובה נכונה בעולם, אם היא לא נתמכת בקטעים — החזר fail.
- אם התשובה היא "אין לי מספיק מידע" — זו pass (המערכת התנהגה נכון).`;
  const user = `שאלה: ${question}\n\nקטעים:\n${context}\n\nתשובת המערכת:\n${answer}\n\nהאם התשובה נתמכת בקטעים? השב רק pass או fail:`;
  const raw = await chat([
    { role: "system", content: system },
    { role: "user", content: user },
  ], { max_tokens: 10 });
  const clean = raw.trim().toLowerCase();
  if (clean.startsWith("pass")) return "pass";
  return "fail";
}

async function rewrite(originalQuestion: string, priorAnswer: string): Promise<string> {
  const system = `אתה עוזר שמשפר ניסוח של שאלות עבור מערכת חיפוש מסמכים. ענה רק עם השאלה המנוסחת מחדש, בלי הסברים.`;
  const user = `שאלה מקורית: ${originalQuestion}\n\nהתשובה הקודמת לא הייתה מספקת: ${priorAnswer.slice(0, 200)}\n\nנסח את השאלה מחדש כך שהחיפוש במסמכים יהיה ממוקד וברור יותר. אל תשנה את המשמעות. החזר רק את השאלה המנוסחת:`;
  const raw = await chat([
    { role: "system", content: system },
    { role: "user", content: user },
  ], { max_tokens: 120 });
  return raw.trim().replace(/^["'״]+|["'״]+$/g, "");
}

export async function ask(question: string, actorUserId?: string): Promise<RagResult> {
  const started = Date.now();
  let rewritten: string | null = null;
  let retryCount = 0;

  let query = question;
  let docs = await retrieve(query);
  let answer = await generate(question, docs);
  let g = await grade(question, docs, answer);

  while (g === "fail" && retryCount < MAX_RETRIES) {
    retryCount++;
    rewritten = await rewrite(question, answer);
    query = rewritten;
    docs = await retrieve(query);
    answer = await generate(question, docs);
    g = await grade(question, docs, answer);
  }

  const finalGrade: "pass" | "fail" | "give_up" = g === "pass" ? "pass" : (retryCount >= MAX_RETRIES ? "give_up" : "fail");
  if (finalGrade === "give_up") {
    answer = "אין לי מספיק מידע במסמכים כדי לענות על השאלה. נסה לנסח אותה בצורה אחרת או להוסיף את המידע לבסיס הידע.";
  }

  const elapsed_ms = Date.now() - started;

  // Log the query (fire-and-forget-ish)
  try {
    const sb = createServiceClient();
    await sb.from("rag_queries").insert({
      user_id: actorUserId ?? null,
      question,
      rewritten,
      answer,
      grade: finalGrade,
      retrieved_ids: docs.map((d) => d.id),
      retry_count: retryCount,
      elapsed_ms,
    });
  } catch {}

  return {
    question,
    rewritten,
    answer,
    grade: finalGrade,
    retrieved: docs,
    retry_count: retryCount,
    elapsed_ms,
  };
}
