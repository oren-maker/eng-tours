const BASE = process.env.WASENDER_API_URL || "https://wasenderapi.com/api";
const KEY = process.env.WASENDER_API_KEY || "";

function headers() {
  return {
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  if (!KEY) return { ok: false, status: 0, error: "WASENDER_API_KEY not configured" };
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      return { ok: false, status: res.status, error: data?.message || data?.error || `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status, data: data as T };
  } catch (err: any) {
    return { ok: false, status: 0, error: err.message || "Network error" };
  }
}

export interface WaSession {
  id: string | number;
  name?: string;
  phone_number?: string;
  status?: string;
  account_protection?: boolean;
  log_messages?: boolean;
  webhook_url?: string;
  webhook_enabled?: boolean;
}

export const wasender = {
  listSessions: () => request<{ data: WaSession[] } | WaSession[]>("GET", "/whatsapp-sessions"),
  getSession: (id: string | number) => request<WaSession>("GET", `/whatsapp-sessions/${id}`),
  createSession: (payload: { name: string; phone_number: string; account_protection?: boolean; log_messages?: boolean; webhook_url?: string; webhook_enabled?: boolean }) =>
    request<WaSession>("POST", "/whatsapp-sessions", payload),
  updateSession: (id: string | number, payload: Partial<WaSession>) =>
    request<WaSession>("PUT", `/whatsapp-sessions/${id}`, payload),
  deleteSession: (id: string | number) =>
    request<unknown>("DELETE", `/whatsapp-sessions/${id}`),
  connectSession: (id: string | number) =>
    request<{ qrCode?: string; status?: string }>("POST", `/whatsapp-sessions/${id}/connect`),
  disconnectSession: (id: string | number) =>
    request<unknown>("POST", `/whatsapp-sessions/${id}/disconnect`),
  regenerateQr: (id: string | number) =>
    request<{ qrCode?: string }>("POST", `/whatsapp-sessions/${id}/regenerate-qrcode`),
  getQr: (id: string | number) =>
    request<{ qrCode?: string }>("GET", `/whatsapp-sessions/${id}/qrcode`),
  getStatus: (id: string | number) =>
    request<{ status?: string }>("GET", `/whatsapp-sessions/${id}/status`),
  sendText: (payload: { to: string; text: string; sessionId?: string | number }) =>
    request<{ msgId?: string }>("POST", "/send-message", payload),

  // Send using a per-session API key (required for /send-message)
  sendTextWithSessionKey: async (sessionApiKey: string, payload: { to: string; text: string }) => {
    if (!sessionApiKey) return { ok: false, status: 0, error: "Session API key missing" };
    try {
      const res = await fetch(`${BASE}/send-message`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionApiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      if (!res.ok) return { ok: false, status: res.status, error: data?.message || `HTTP ${res.status}`, data };
      return { ok: true, status: res.status, data };
    } catch (err: any) {
      return { ok: false, status: 0, error: err.message || "Network error" };
    }
  },
};

export function isConfigured() {
  return !!KEY;
}
