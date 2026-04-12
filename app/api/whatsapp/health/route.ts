import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkHealth } from "@/lib/wesender";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const health = await checkHealth();
    return NextResponse.json(health);
  } catch (err) {
    console.error("WhatsApp health check error:", err);
    return NextResponse.json(
      { online: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
