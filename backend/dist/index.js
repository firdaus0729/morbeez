import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { buildApp } from './app.js';
import { startOutboxWorkerIfEnabled } from './services/events/outbox.worker.js';
import { startAdvisoryAutomationWorker } from './services/automation/advisory-automation.worker.js';
async function main() {
    const app = await buildApp();
    startOutboxWorkerIfEnabled();
    startAdvisoryAutomationWorker();
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Morbeez API started');
}
main().catch((err) => {
    logger.fatal({ err }, 'Failed to start');
    process.exit(1);
});
//# sourceMappingURL=index.js.map