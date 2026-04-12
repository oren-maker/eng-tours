import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendWhatsApp } from "@/lib/wesender";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { number, templateName, variables } = body;

    if (!number) {
      return NextResponse.json(
        { error: "Missing phone number" },
        { status: 400 }
      );
    }

    // If no template, send as free text
    const result = await sendWhatsApp(
      number,
      templateName || "free_text",
      variables || {}
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("WhatsApp send error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
