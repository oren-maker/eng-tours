import { z } from "zod";

// Shared primitives
const uuid = z.string().uuid();
const nonEmpty = z.string().min(1).max(500);
const email = z.string().email().max(254);
const phone = z.string().regex(/^\+?[0-9\-\s]{7,20}$/, "invalid phone");
const positiveNumber = z.number().finite().min(0);

export const passengerSchema = z.object({
  first_name_en: z.string().min(1).max(60),
  last_name_en: z.string().min(1).max(60),
  passport_number: z.string().min(4).max(30),
  passport_expiry: z.string().optional(),
  birth_date: z.string().optional(),
  age_at_event: z.number().int().min(0).max(120).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(254).optional().nullable(),
  flight_id: z.string().uuid().optional().nullable(),
  return_flight_id: z.string().uuid().optional().nullable(),
  room_id: z.string().uuid().optional().nullable(),
  ticket_id: z.string().uuid().optional().nullable(),
  package_id: z.string().uuid().optional().nullable(),
  passport_image_url: z.string().url().optional().nullable(),
});

export const createOrderSchema = z.object({
  event_id: z.string().max(50), // allow short event_ids like RL57054 or UUIDs
  mode: z.enum(["registration", "payment"]).optional(),
  contact_email: email.optional(),
  contact_phone: z.string().max(30).optional(),
  coupon_code: z.string().max(50).optional(),
  total_price: positiveNumber.optional(),
  participants: z.array(passengerSchema).min(1).max(20),
});

export const paymentSchema = z.object({
  share_token: uuid,
  participant_id: z.string().uuid().optional().nullable(),
  amount: z.number().positive().finite().max(10_000_000),
  method: z.enum(["credit", "transfer", "cash", "check"]).optional(),
  card_last4: z.string().regex(/^\d{4}$/).optional().nullable(),
  confirmation: z.string().max(100).optional().nullable(),
  date: z.string().optional().nullable(),
});

export const supplierConfirmAllSchema = z.object({
  share_token: uuid,
  items: z.array(z.object({
    item_type: z.enum(["flight", "room", "ticket"]),
    item_id: uuid,
    confirmation_number: z.string().max(100).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    has_issue: z.boolean().optional(),
    issue_description: z.string().max(2000).optional().nullable(),
    payment_amount: z.number().min(0).finite().optional().nullable(),
    payment_currency: z.string().max(10).optional().nullable(),
    payment_method: z.string().max(30).optional().nullable(),
    payment_installments: z.number().int().min(0).max(36).optional().nullable(),
    payment_confirmation: z.string().max(100).optional().nullable(),
    payment_date: z.string().optional().nullable(),
    payment_due_date: z.string().optional().nullable(),
  })).max(20),
});

export const supplierAuthSchema = z.object({
  email: z.string().max(254),
  password: z.string().min(1).max(200),
});

export const whatsappSendSchema = z.object({
  number: z.string().min(7).max(30),
  message: z.string().max(4096).optional(),
  templateName: z.string().max(100).optional(),
  variables: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  sessionId: z.union([z.string(), z.number()]).optional(),
});

export const unsubscribeSchema = z.object({
  email: z.string().email().max(254),
  token: z.string().max(200),
  reason: z.string().max(500).optional().nullable(),
});

export const couponValidateSchema = z.object({
  code: z.string().min(1).max(50),
  event_id: z.string().max(50).optional(),
});

export { z, nonEmpty, uuid, email, phone };

// Validation helper — returns 400 JSON response on failure
export function parseOrFail<T>(schema: z.ZodSchema<T>, data: unknown): { ok: true; data: T } | { ok: false; error: string } {
  const r = schema.safeParse(data);
  if (!r.success) {
    const issue = r.error.issues[0];
    const path = issue.path.join(".") || "input";
    return { ok: false, error: `${path}: ${issue.message}` };
  }
  return { ok: true, data: r.data };
}
