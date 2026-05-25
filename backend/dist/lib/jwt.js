import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../config/env.js';
import { UnauthorizedError } from './errors.js';
function base64url(input) {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
function sign(data) {
    return createHmac('sha256', env.FARMER_JWT_SECRET).update(data).digest('base64url');
}
export function createFarmerToken(farmerId, email, ttlDays = 30) {
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const exp = Math.floor(Date.now() / 1000) + ttlDays * 86400;
    const payload = base64url(JSON.stringify({ sub: farmerId, email, exp }));
    const signature = sign(`${header}.${payload}`);
    return `${header}.${payload}.${signature}`;
}
export function verifyFarmerToken(token) {
    const parts = token.split('.');
    if (parts.length !== 3)
        throw new UnauthorizedError('Invalid session');
    const [header, payload, signature] = parts;
    const expected = sign(`${header}.${payload}`);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw new UnauthorizedError('Invalid session');
    }
    let decoded;
    try {
        decoded = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    }
    catch {
        throw new UnauthorizedError('Invalid session');
    }
    if (!decoded.sub || !decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedError('Session expired');
    }
    return decoded;
}
export function getBearerToken(authorization) {
    if (!authorization?.startsWith('Bearer '))
        return null;
    return authorization.slice(7).trim() || null;
}
//# sourceMappingURL=jwt.js.map