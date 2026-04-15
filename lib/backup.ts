import { createServiceClient } from "./supabase";

const BUCKET = "backups";

// Ordered list of tables to snapshot
const TABLES = [
  "users", "events", "flights", "hotels", "rooms", "tickets", "packages",
  "orders", "participants", "supplier_confirmations", "coupons", "waiting_list",
  "whatsapp_log", "audit_log", "faq", "system_settings", "whatsapp_templates",
  "email_templates", "email_unsubscribes", "email_log", "email_unsubscribe_log", "backups",
];

async function ensureBucket(supabase: ReturnType<typeof createServiceClient>) {
  const { data } = await supabase.storage.listBuckets();
  if (!data?.some((b) => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: false });
  }
}

export async function runBackup(trigger: "auto" | "manual") {
  const supabase = createServiceClient();
  const startedAt = Date.now();
  const iso = new Date().toISOString();

  // Insert pending row (will be updated on finish)
  const { data: pending, error: pErr } = await supabase
    .from("backups")
    .insert({ trigger, status: "success", size_bytes: 0, tables_count: 0, rows_count: 0 })
    .select()
    .single();
  if (pErr || !pending) throw new Error(pErr?.message || "Failed to create backup record");

  try {
    await ensureBucket(supabase);

    const snapshot: Record<string, any[]> = {};
    let totalRows = 0;
    let tablesDone = 0;

    for (const table of TABLES) {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        // Non-fatal: table may not exist in this env
        snapshot[table] = [];
        continue;
      }
      snapshot[table] = data || [];
      totalRows += data?.length || 0;
      tablesDone++;
    }

    const payload = {
      version: 1,
      created_at: iso,
      trigger,
      tables: snapshot,
    };

    const json = JSON.stringify(payload);
    const size = Buffer.byteLength(json, "utf8");
    const fileName = `backup_${iso.replace(/[:.]/g, "-")}_${pending.id}.json`;
    const storagePath = `${fileName}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, Buffer.from(json), {
      contentType: "application/json",
      upsert: false,
    });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    await supabase
      .from("backups")
      .update({
        status: "success",
        size_bytes: size,
        tables_count: tablesDone,
        rows_count: totalRows,
        storage_path: storagePath,
        duration_ms: Date.now() - startedAt,
      })
      .eq("id", pending.id);

    // Retention: keep last 30 successful backups, delete older
    const { data: old } = await supabase
      .from("backups")
      .select("id, storage_path")
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .range(30, 999);
    if (old && old.length > 0) {
      const paths = old.map((b: any) => b.storage_path).filter(Boolean);
      if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);
      await supabase.from("backups").delete().in("id", old.map((b: any) => b.id));
    }

    return { id: pending.id, size, rows: totalRows, tables: tablesDone };
  } catch (e: any) {
    await supabase
      .from("backups")
      .update({
        status: "failed",
        error_msg: e?.message?.slice(0, 500) || "Unknown error",
        duration_ms: Date.now() - startedAt,
      })
      .eq("id", pending.id);
    throw e;
  }
}
