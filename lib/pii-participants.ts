import { decryptPII, encryptPII } from "@/lib/pii";

type ParticipantLike = {
  passport_number?: string | null;
  passport_number_enc?: string | null;
};

/**
 * Given a participant row that may have both the legacy plaintext column
 * and the new encrypted column, return the passport number as string | null.
 * Prefers the encrypted column (source of truth once backfilled).
 */
export function readPassportNumber<T extends ParticipantLike>(row: T | null | undefined): string | null {
  if (!row) return null;
  if (row.passport_number_enc) {
    const pt = decryptPII(row.passport_number_enc);
    if (pt) return pt;
  }
  return row.passport_number ?? null;
}

/**
 * Mutating pass: for each participant row, replaces passport_number with
 * the decrypted value (preferring encrypted column) and drops passport_number_enc
 * from the returned shape so downstream code / UI is unchanged.
 */
export function hydratePassportNumbers<T extends ParticipantLike>(rows: T[] | null | undefined): T[] {
  if (!rows) return [];
  for (const row of rows) {
    const v = readPassportNumber(row);
    row.passport_number = v;
    // keep encrypted column present — some admin views may show "encrypted yes" indicator
  }
  return rows;
}

/**
 * Prepare an insert/update payload. Accepts passport_number as plaintext,
 * writes both the encrypted and plaintext columns during the transition
 * period. Once reads are fully on the encrypted column, the plaintext write
 * can be removed and the column dropped.
 */
export function writePassportPayload(passportNumber: string | null | undefined): {
  passport_number: string | null;
  passport_number_enc: string | null;
} {
  const pt = passportNumber && passportNumber.trim() ? passportNumber.trim() : null;
  return {
    passport_number: pt,
    passport_number_enc: encryptPII(pt),
  };
}
