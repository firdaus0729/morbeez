/** Normalize Indian mobile to E.164 without + prefix (e.g. 919876543210) */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
}

export function isValidIndianPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^91[6-9]\d{9}$/.test(normalized);
}

/** Meta WhatsApp wa_id — often 10-digit Indian mobile without country code. */
export function normalizeWhatsAppWaId(waId: string): string {
  const digits = waId.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
}
