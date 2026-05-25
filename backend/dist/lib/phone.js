/** Normalize Indian mobile to E.164 without + prefix (e.g. 919876543210) */
export function normalizePhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10)
        return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91'))
        return digits;
    return digits;
}
export function isValidIndianPhone(phone) {
    const normalized = normalizePhone(phone);
    return /^91[6-9]\d{9}$/.test(normalized);
}
//# sourceMappingURL=phone.js.map