import type { FastifyInstance } from 'fastify';
import { assertModuleAccess } from '../../lib/rbac.js';
import { osAnalyticsService } from '../../services/admin/os-analytics.service.js';

function parseDays(q: { days?: string }): number {
  const n = q.days ? Number(q.days) : 30;
  return Math.min(Math.max(n, 7), 90);
}

export async function osAnalyticsRoutes(app: FastifyInstance): Promise<void> {
  const api = '/console/api/v1/os/analytics';

  app.get(`${api}/summary`, async (request, reply) => {
    await assertModuleAccess(request, 'analytics', 'read');
    const days = parseDays(request.query as { days?: string });
    const summary = await osAnalyticsService.getSummary(days);
    return reply.send({ ok: true, ...summary });
  });

  app.get(`${api}/geography`, async (request, reply) => {
    await assertModuleAccess(request, 'analytics', 'read');
    const days = parseDays(request.query as { days?: string });
    const geography = await osAnalyticsService.getDistrictHeatmap(days);
    return reply.send({ ok: true, geography });
  });

  app.get(`${api}/geography/:district/pincodes`, async (request, reply) => {
    await assertModuleAccess(request, 'analytics', 'read');
    const { district } = request.params as { district: string };
    const days = parseDays(request.query as { days?: string });
    const breakdown = await osAnalyticsService.getPincodeBreakdown(
      decodeURIComponent(district),
      days
    );
    return reply.send({ ok: true, ...breakdown });
  });

  app.get(`${api}/retention`, async (request, reply) => {
    await assertModuleAccess(request, 'analytics', 'read');
    const days = parseDays(request.query as { days?: string });
    const retention = await osAnalyticsService.getRetention(days);
    return reply.send({ ok: true, retention });
  });

  app.get(`${api}/broadcasts`, async (request, reply) => {
    await assertModuleAccess(request, 'analytics', 'read');
    const days = parseDays(request.query as { days?: string });
    const broadcasts = await osAnalyticsService.getBroadcastPerformance(days);
    return reply.send({ ok: true, broadcasts });
  });

  app.get(`${api}/recommendations`, async (request, reply) => {
    await assertModuleAccess(request, 'analytics', 'read');
    const days = parseDays(request.query as { days?: string });
    const recommendations = await osAnalyticsService.getRecommendationSuccess(days);
    return reply.send({ ok: true, recommendations });
  });
}
