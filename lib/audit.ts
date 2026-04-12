import { createServiceClient } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface AuditLogParams {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAction(
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  beforeData?: Record<string, unknown> | null,
  afterData?: Record<string, unknown> | null,
  ipAddress?: string
) {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("audit_log").insert({
      user_id: userId ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      before_data: beforeData ?? null,
      after_data: afterData ?? null,
      ip_address: ipAddress ?? null,
      created_at: new Date().toISOString(),
    });
    if (error) console.error("Audit log error:", error);
  } catch (e) {
    console.error("Audit log exception:", e);
  }
}

export async function logAudit(params: AuditLogParams) {
  return logAction(
    params.userId ?? null,
    params.action,
    params.entityType,
    params.entityId,
    params.beforeData,
    params.afterData,
    params.ipAddress
  );
}

// Simple helper that auto-fetches current user session
export async function audit(
  action: string,
  entityType: string,
  entityId?: string,
  data?: { before?: Record<string, unknown>; after?: Record<string, unknown> },
  request?: Request
) {
  let userId: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    userId = (session?.user as any)?.id || null;
  } catch {
    // ignore
  }

  let ip: string | undefined;
  if (request) {
    ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
  }

  return logAction(userId, action, entityType, entityId, data?.before, data?.after, ip);
}
