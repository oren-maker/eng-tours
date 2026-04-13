import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getEventsForReminders, shouldAutoSendReminders } from "@/lib/event-automation";
import { sendWhatsApp } from "@/lib/wesender";

export async function POST() {
  try {
    // Check if auto-reminders are enabled
    const autoSend = await shouldAutoSendReminders();
    if (!autoSend) {
      return NextResponse.json({ 
        success: true, 
        message: "Auto-reminders disabled", 
        count: 0 
      });
    }

    // Get reminder days setting
    const supabase = createServiceClient();
    const { data: reminderSetting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "reminder_days_before")
      .single();

    const reminderDays = reminderSetting 
      ? parseInt(JSON.parse(reminderSetting.value)) 
      : 7;

    // Get events that need reminders
    const events = await getEventsForReminders(reminderDays);

    if (events.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No events need reminders", 
        count: 0 
      });
    }

    // Get attendees for each event and send reminders
    let remindersSent = 0;

    for (const event of events) {
      // Get attendees
      const { data: orders } = await supabase
        .from("orders")
        .select("id, customer_phone, customer_name")
        .eq("event_id", event.id)
        .in("status", ["confirmed", "partial"]);

      if (!orders || orders.length === 0) continue;

      // Send reminder to each attendee
      for (const order of orders) {
        try {
          const result = await sendWhatsApp(
            order.customer_phone,
            "event_reminder",
            {
              customer_name: order.customer_name,
              event_name: event.name,
              days: reminderDays.toString(),
            },
            {
              order_id: order.id,
              recipient_type: "customer",
            }
          );

          if (result.success) {
            remindersSent++;
          }
        } catch (err) {
          console.error(`Failed to send reminder to ${order.customer_phone}:`, err);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sent ${remindersSent} reminders`,
      count: remindersSent 
    });
  } catch (error) {
    console.error("Error in auto-reminders:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send reminders" },
      { status: 500 }
    );
  }
}

// This endpoint can be called by Vercel Cron or external cron service
// Example: Vercel cron with: 0 9 * * * (daily at 9 AM UTC)
