export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";

// PATCH /api/supplier-confirmations/[id] - Admin updates a confirmation
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const body = await request.json();

  // Load existing to detect changes
  const { data: existing } = await supabase
    .from("supplier_confirmations")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "אישור לא נמצא" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  const changes: Record<string, { from: any; to: any }> = {};

  if (body.confirmation_number !== undefined && body.confirmation_number !== existing.confirmation_number) {
    updates.confirmation_number = body.confirmation_number;
    changes.confirmation_number = { from: existing.confirmation_number, to: body.confirmation_number };
  }
  if (body.notes !== undefined && body.notes !== existing.notes) {
    updates.notes = body.notes;
    changes.notes = { from: existing.notes, to: body.notes };
  }
  if (body.has_issue !== undefined && !!body.has_issue !== !!existing.has_issue) {
    updates.has_issue = !!body.has_issue;
    changes.has_issue = { from: existing.has_issue, to: body.has_issue };
  }
  if (body.issue_description !== undefined && body.issue_description !== existing.issue_description) {
    updates.issue_description = body.issue_description;
    changes.issue_description = { from: existing.issue_description, to: body.issue_description };
  }
  for (const f of [
    "payment_amount", "payment_currency", "payment_method",
    "payment_installments", "payment_confirmation", "payment_date", "payment_due_date",
  ]) {
    if (body[f] !== undefined && String(body[f] ?? "") !== String(existing[f] ?? "")) {
      updates[f] = body[f];
      changes[f] = { from: existing[f], to: body[f] };
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: true, message: "אין שינויים" });
  }

  const { data, error } = await supabase
    .from("supplier_confirmations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Audit log with full change details
  await audit("update", "supplier_confirmation", id, {
    before: existing as Record<string, unknown>,
    after: { ...(data as Record<string, unknown>), changes },
  }, request);

  return NextResponse.json({ success: true, data });
}

// DELETE /api/supplier-confirmations/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("supplier_confirmations")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "אישור לא נמצא" }, { status: 404 });
  }

  const { error } = await supabase
    .from("supplier_confirmations")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await audit("delete", "supplier_confirmation", id, {
    before: existing as Record<string, unknown>,
  }, request);

  return NextResponse.json({ success: true });
}
