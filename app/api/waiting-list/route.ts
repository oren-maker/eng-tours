import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET /api/waiting-list - Admin: list waitlist entries with optional event filter
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const eventId = request.nextUrl.searchParams.get("event_id");

  let query = supabase
    .from("waiting_list")
    .select("*, events(name)")
    .order("position", { ascending: true });

  if (eventId) {
    query = query.eq("event_id", eventId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries = (data || []).map((row) => ({
    ...row,
    event_name: (row.events as { name: string } | null)?.name || null,
    events: undefined,
  }));

  return NextResponse.json({ entries });
}

// POST /api/waiting-list - Public: join waitlist
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();

  try {
    const body = await request.json();
    const { event_id, full_name, email, phone, whatsapp } = body;

    if (!event_id || !full_name || !email) {
      return NextResponse.json(
        { error: "נדרש אירוע, שם ומייל" },
        { status: 400 }
      );
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from("waiting_list")
      .select("id")
      .eq("event_id", event_id)
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "כבר רשום ברשימת ההמתנה לאירוע זה" },
        { status: 409 }
      );
    }

    // Get next position
    const { data: lastEntry } = await supabase
      .from("waiting_list")
      .select("position")
      .eq("event_id", event_id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (lastEntry?.position || 0) + 1;

    const { data, error } = await supabase
      .from("waiting_list")
      .insert({
        event_id,
        full_name,
        email,
        phone: phone || null,
        whatsapp: whatsapp || null,
        position: nextPosition,
        notified: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entry: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "שגיאה בהוספה לרשימת המתנה" },
      { status: 500 }
    );
  }
}

// PATCH /api/waiting-list - Admin: update entry (e.g., mark as notified)
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const supabase = createServiceClient();

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "נדרש מזהה" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("waiting_list")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entry: data });
  } catch {
    return NextResponse.json({ error: "שגיאה בעדכון" }, { status: 500 });
  }
}
