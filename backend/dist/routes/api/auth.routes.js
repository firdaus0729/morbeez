import { z } from 'zod';
import { farmerAuthService } from '../../services/auth/farmer-auth.service.js';
import { getBearerToken, verifyFarmerToken } from '../../lib/jwt.js';
import { UnauthorizedError } from '../../lib/errors.js';
const signupSchema = z.object({
    email: z.string().email().max(255),
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    password: z.string().min(8).max(128),
    acceptTerms: z.literal(true),
    newsletter: z.boolean().default(false),
});
const loginSchema = z.object({
    email: z.string().email().max(255),
    password: z.string().min(1).max(128),
});
/**
 * Storefront farmer auth — called from theme JS (CORS).
 * App proxy path /apps/morbeez/auth/* mirrors these at /proxy/auth/* when configured.
 */
export async function authRoutes(app) {
    app.post('/api/v1/auth/signup', async (request, reply) => {
        const body = signupSchema.parse(request.body);
        const result = await farmerAuthService.signup(body);
        return reply.code(201).send({ ok: true, ...result });
    });
    app.post('/api/v1/auth/login', async (request, reply) => {
        const body = loginSchema.parse(request.body);
        const result = await farmerAuthService.login(body);
        return reply.send({ ok: true, ...result });
    });
    app.get('/api/v1/auth/me', async (request, reply) => {
        const token = getBearerToken(request.headers.authorization);
        if (!token)
            throw new UnauthorizedError('Not signed in');
        const payload = verifyFarmerToken(token);
        const farmer = await farmerAuthService.me(payload.sub);
        return reply.send({ ok: true, farmer });
    });
}
//# sourceMappingURL=auth.routes.js.map