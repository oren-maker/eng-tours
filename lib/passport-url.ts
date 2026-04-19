import { createServiceClient } from "@/lib/supabase";

const SHORT_TTL_SECONDS = 60 * 60; // 1 hour — plenty for a page render

/**
 * Extract the storage filename from a Supabase signed URL.
 * URL pattern: https://<project>.supabase.co/storage/v1/object/sign/<bucket>/<filename>?token=...
 * Returns null if the URL is not a recognized Supabase signed/public URL.
 */
function extractFilename(storedUrl: string): string | null {
  if (!storedUrl) return null;
  const m = storedUrl.match(/\/object\/(?:sign|public)\/passports\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Given a stored passport URL (which may be near/past expiry), return a
 * freshly-signed URL with a short TTL. Falls back to the original string
 * if we can't parse it (e.g. external URL, or a legacy format).
 */
export async function refreshPassportUrl(storedUrl: string | null | undefined): Promise<string | null> {
  if (!storedUrl) return null;
  const filename = extractFilename(storedUrl);
  if (!filename) return storedUrl;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.storage
      .from("passports")
      .createSignedUrl(filename, SHORT_TTL_SECONDS);
    if (error || !data?.signedUrl) return storedUrl;
    return data.signedUrl;
  } catch {
    return storedUrl;
  }
}

/**
 * Bulk-refresh signed URLs on an array of participants (mutates the URL
 * field in place but does not otherwise modify the objects). Used by
 * endpoints that return participant lists to clients.
 */
export async function refreshParticipantPassportUrls<T extends { passport_image_url?: string | null }>(
  participants: T[] | null | undefined
): Promise<T[]> {
  if (!participants || participants.length === 0) return participants || [];
  await Promise.all(
    participants.map(async (p) => {
      if (p.passport_image_url) {
        p.passport_image_url = await refreshPassportUrl(p.passport_image_url);
      }
    })
  );
  return participants;
}
