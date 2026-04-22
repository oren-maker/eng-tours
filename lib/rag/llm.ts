// Groq LLM wrapper — matches the guide's ChatGroq llama-3.3-70b-versatile.
// temperature=0 so retrieval-grounded answers don't drift.

const GROQ_KEY = process.env.GROQ_API_KEY || "";
const MODEL = "llama-3.3-70b-versatile";

export async function chat(messages: { role: "system" | "user" | "assistant"; content: string }[], opts?: { temperature?: number; max_tokens?: number }): Promise<string> {
  if (!GROQ_KEY) throw new Error("GROQ_API_KEY not configured");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: opts?.temperature ?? 0,
      max_tokens: opts?.max_tokens ?? 1024,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}: ${body.slice(0, 200)}`);
  }
  const j = await res.json();
  return j?.choices?.[0]?.message?.content || "";
}
