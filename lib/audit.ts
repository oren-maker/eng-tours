import { createServiceClient } from "@/lib/supabase";

interface AuditLogParams {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAction(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  beforeData?: Record<string, unknown>,
  afterData?: Record<string, unknown>,
  ipAddress?: string
) {
  const supabase = createServiceClient();

  const { error } = await supabase.from("audit_log").insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    before_data: beforeData ?? null,
    after_data: afterData ?? null,
    ip_address: ipAddress ?? null,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Failed to write audit log:", error);
  }
}

// Convenience wrapper accepting an object
export async function logAudit(params: AuditLogParams) {
  return logAction(
    params.userId,
    params.action,
    params.entityType,
    params.entityId,
    params.beforeData,
    params.afterData,
    params.ipAddress
  );
}
