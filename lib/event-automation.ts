import { createServiceClient } from "@/lib/supabase";

/**
 * Get system setting for events automation
 */
export async function getEventAutomationSetting(key: string): Promise<boolean | string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .single();

  if (error || !data) return null;
  
  try {
    return JSON.parse(data.value);
  } catch {
    return data.value;
  }
}

/**
 * Check if events should be auto-activated on creation
 */
export async function shouldAutoActivateOnCreation(): Promise<boolean> {
  const setting = await getEventAutomationSetting("auto_activate_on_creation");
  return setting === true || setting === "true";
}

/**
 * Check if events should be auto-archived after end date
 */
export async function shouldAutoArchivePastEvents(): Promise<boolean> {
  const setting = await getEventAutomationSetting("auto_archive_past_events");
  return setting === true || setting === "true";
}

/**
 * Check if reminders should be sent automatically
 */
export async function shouldAutoSendReminders(): Promise<boolean> {
  const setting = await getEventAutomationSetting("auto_send_reminders");
  return setting === true || setting === "true";
}

/**
 * Get default status for new event based on automation settings
 */
export async function getDefaultEventStatus(): Promise<"active" | "draft"> {
  const shouldActivate = await shouldAutoActivateOnCreation();
  return shouldActivate ? "active" : "draft";
}

/**
 * Auto-archive events that have passed their end date
 */
export async function autoArchiveExpiredEvents(): Promise<void> {
  const supabase = createServiceClient();
  const shouldArchive = await shouldAutoArchivePastEvents();

  if (!shouldArchive) return;

  const today = new Date().toISOString().split("T")[0];
  await supabase
    .from("events")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("status", "active")
    .lt("end_date", today);
}

/**
 * Get events that need reminders (start in N days)
 */
export async function getEventsForReminders(daysBeforeStart: number = 7) {
  const supabase = createServiceClient();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + daysBeforeStart);
  const targetDate = startDate.toISOString().split("T")[0];
  
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "active")
    .gte("start_date", today)
    .lte("start_date", targetDate);

  if (error) {
    console.error("Error fetching events for reminders:", error);
    return [];
  }

  return data || [];
}
