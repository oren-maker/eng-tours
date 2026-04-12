import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET /api/settings - Get all settings (admin only)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("system_settings")
    .select("key, value");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Convert array of {key, value} to a flat object
  const settings: Record<string, unknown> = {};
  for (const row of data || []) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }

  return NextResponse.json({ settings });
}

// PATCH /api/settings - Update settings (admin only)
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const supabase = createServiceClient();

  try {
    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      const serialized = typeof value === "string" ? value : JSON.stringify(value);

      // Upsert each setting
      const { error } = await supabase
        .from("system_settings")
        .upsert(
          { key, value: serialized, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );

      if (error) {
        console.error(`Failed to update setting ${key}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "שגיאה בעדכון הגדרות" }, { status: 500 });
  }
}
