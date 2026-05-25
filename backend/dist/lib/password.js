import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
const KEY_LEN = 64;
export function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, KEY_LEN).toString('hex');
    return `${salt}:${hash}`;
}
export function verifyPassword(password, stored) {
    const parts = stored.split(':');
    if (parts.length !== 2)
        return false;
    const [salt, hash] = parts;
    const hash2 = scryptSync(password, salt, KEY_LEN).toString('hex');
    try {
        return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hash2, 'hex'));
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=password.js.map