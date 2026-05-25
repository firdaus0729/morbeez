import pino from 'pino';
import { env } from '../config/env.js';
export const logger = pino({
    level: env.LOG_LEVEL,
    transport: env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    base: { service: 'morbeez-api' },
    redact: ['req.headers.authorization', 'req.headers["x-api-key"]'],
});
//# sourceMappingURL=logger.js.map