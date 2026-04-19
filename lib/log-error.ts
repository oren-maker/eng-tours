import { createServiceClient } from "@/lib/supabase";

/**
 * Non-throwing error logger — writes to audit_log with action='server_error'.
 * Use in catch blocks where you want durable record without failing the request.
 * Safe to call from any runtime (edge, node, cron).
 */
export async function logError(
  context: string,
  err: unknown,
  extra?: Record<string, unknown>
) {
  try {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.slice(0, 2000) : undefined;
    const supabase = createServiceClient();
    await supabase.from("audit_log").insert({
      action: "server_error",
      entity_type: "error",
      entity_id: null,
      after_data: { context, message, stack: stack || null, extra: extra || null },
      created_at: new Date().toISOString(),
    });
  } catch {
    // intentionally swallow — logging must not break the caller
  }
}
