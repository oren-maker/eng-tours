// Gemini text-embedding-004 — 768 dims, free tier, no SDK dependency.
// Uses the REST endpoint so we don't pull a heavy SDK that complicates edge/node runtime.

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const MODEL = "gemini-embedding-001";
const DIM = 768;

export async function embed(text: string): Promise<number[] | null> {
  if (!text || !text.trim()) return null;
  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY not configured");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${MODEL}`,
        content: { parts: [{ text: text.slice(0, 8000) }] },
        outputDimensionality: DIM,
      }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini embed ${res.status}: ${body.slice(0, 200)}`);
  }

  const j = await res.json();
  const values = j?.embedding?.values;
  if (!Array.isArray(values) || values.length !== DIM) {
    throw new Error(`Gemini embed returned unexpected shape (len=${values?.length})`);
  }
  return values;
}

export async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  const out: (number[] | null)[] = [];
  for (const t of texts) {
    out.push(await embed(t));
    // Gemini free tier: 1,500 RPM. 50ms spacing is safe.
    await new Promise((r) => setTimeout(r, 50));
  }
  return out;
}

export const EMBEDDING_DIMS = DIM;
