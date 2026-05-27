import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';
import { supabase } from '../lib/supabase.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok',
    service: 'morbeez-api',
    timestamp: new Date().toISOString(),
  }));

  /** Debug Meta webhook setup on Render (does not expose secrets). */
  app.get('/health/whatsapp-meta', async (_req, reply) => {
    const base = {
      provider: env.WHATSAPP_PROVIDER,
      verifyTokenConfigured: Boolean(env.WHATSAPP_VERIFY_TOKEN?.trim()),
      phoneNumberIdConfigured: Boolean(env.WHATSAPP_PHONE_NUMBER_ID?.trim()),
      accessTokenConfigured: Boolean(env.WHATSAPP_ACCESS_TOKEN?.trim()),
      appSecretConfigured: Boolean(env.WHATSAPP_APP_SECRET?.trim()),
      openaiConfigured: Boolean(env.OPENAI_API_KEY?.trim()),
      enableOpenaiReply: env.ENABLE_WHATSAPP_OPENAI_REPLY,
      enableCropDoctor: env.ENABLE_AI_CROP_DOCTOR,
      callbackUrl: `${(env.API_BASE_URL ?? '').replace(/\/$/, '') || 'https://morbeez-api.onrender.com'}/webhooks/whatsapp`,
      callbackPath: '/webhooks/whatsapp',
    };

    if (
      env.WHATSAPP_PROVIDER === 'cloud' &&
      env.WHATSAPP_PHONE_NUMBER_ID &&
      env.WHATSAPP_ACCESS_TOKEN
    ) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}?fields=display_phone_number,verified_name`,
          { headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` } }
        );
        const data = (await res.json()) as {
          display_phone_number?: string;
          verified_name?: string;
          error?: { message: string; code: number };
        };
        if (data.error) {
          return reply.send({
            ...base,
            metaTokenValid: false,
            metaError: data.error.message,
          });
        }
        return reply.send({
          ...base,
          metaTokenValid: true,
          displayPhoneNumber: data.display_phone_number,
          verifiedName: data.verified_name,
        });
      } catch (err) {
        return reply.send({ ...base, metaTokenValid: false, metaError: String(err) });
      }
    }

    return reply.send(base);
  });

  /** Last Meta WhatsApp webhook deliveries logged in Supabase (proves Meta → API). */
  app.get('/health/whatsapp-webhooks', async (_req, reply) => {
    const { data, error } = await supabase
      .from('webhook_logs')
      .select('created_at, status, topic, error_message')
      .eq('provider', 'whatsapp')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return reply.code(503).send({ ok: false, error: error.message });
    }

    const last = data?.[0];
    return reply.send({
      ok: true,
      hint: 'If recentWebhooks is empty after you message +917676026318, Meta is NOT calling your API.',
      recentCount: data?.length ?? 0,
      lastReceivedAt: last?.created_at ?? null,
      lastStatus: last?.status ?? null,
      lastError: last?.error_message ?? null,
      recent: data ?? [],
    });
  });

  app.get('/health/db', async (_req, reply) => {
    const { error } = await supabase.from('farmers').select('id').limit(1);
    if (error) {
      return reply.code(503).send({
        status: 'error',
        database: 'farmers',
        hint:
          error.message?.includes('row-level security') || error.code === '42501'
            ? 'SUPABASE_SERVICE_ROLE_KEY is wrong (use service_role secret, not anon)'
            : error.message,
      });
    }
    return { status: 'ok', database: 'farmers' };
  });
}
