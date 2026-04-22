export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ask } from "@/lib/rag/workflow";
import { logError } from "@/lib/log-error";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { question } = await request.json();
    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json({ error: "חסרה שאלה" }, { status: 400 });
    }
    if (question.length > 2000) {
      return NextResponse.json({ error: "השאלה ארוכה מדי" }, { status: 400 });
    }
    const result = await ask(question.trim(), session.user.id);
    return NextResponse.json(result);
  } catch (err: any) {
    await logError("rag/ask", err);
    return NextResponse.json({ error: err.message || "RAG failed" }, { status: 500 });
  }
}
