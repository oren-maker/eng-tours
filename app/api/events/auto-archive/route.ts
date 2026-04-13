import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { shouldAutoArchivePastEvents } from "@/lib/event-automation";

export async function POST() {
  try {
    // Check if auto-archive is enabled
    const shouldArchive = await shouldAutoArchivePastEvents();
    if (!shouldArchive) {
      return NextResponse.json({ 
        success: true, 
        message: "Auto-archive disabled", 
        archived: 0 
      });
    }

    const supabase = createServiceClient();
    const today = new Date().toISOString().split("T")[0];

    // Archive events whose end_date has passed
    const { data, error } = await supabase
      .from("events")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("status", "active")
      .lt("end_date", today)
      .select();

    if (error) {
      console.error("Error archiving events:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const archivedCount = data?.length || 0;

    return NextResponse.json({ 
      success: true, 
      message: `Archived ${archivedCount} event(s)`,
      archived: archivedCount 
    });
  } catch (error) {
    console.error("Error in auto-archive:", error);
    return NextResponse.json(
      { success: false, error: "Failed to archive events" },
      { status: 500 }
    );
  }
}

// This endpoint can be called by Vercel Cron or external cron service
// Example: Vercel cron with: 0 0 * * * (daily at midnight UTC)
