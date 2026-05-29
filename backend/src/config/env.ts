import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_BASE_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().optional(),

  SHOPIFY_STORE_DOMAIN: z.string().min(1),
  SHOPIFY_ADMIN_API_ACCESS_TOKEN: z.string().min(1),
  SHOPIFY_API_VERSION: z.string().default('2024-10'),
  SHOPIFY_WEBHOOK_SECRET: z.string().min(1),
  SHOPIFY_APP_CLIENT_ID: z.string().optional(),
  SHOPIFY_APP_CLIENT_SECRET: z.string().optional(),
  SHOPIFY_APP_SCOPES: z.string().default('write_app_proxy'),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  SHIPROCKET_EMAIL: z.string().optional(),
  SHIPROCKET_PASSWORD: z.string().optional(),
  SHIPROCKET_WEBHOOK_TOKEN: z.string().optional(),

  WHATSAPP_PROVIDER: z.enum(['cloud', 'wati', 'interakt', 'adsgyani']).default('adsgyani'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  WATI_API_ENDPOINT: z.string().url().optional(),
  WATI_ACCESS_TOKEN: z.string().optional(),
  INTERAKT_API_KEY: z.string().optional(),
  ADS_GYANI_API_BASE: z.string().url().optional(),
  ADS_GYANI_TENANT: z.string().optional(),
  ADS_GYANI_API_TOKEN: z.string().optional(),
  ADS_GYANI_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  ADS_GYANI_WEBHOOK_SECRET: z.string().optional(),
  ADS_GYANI_SEND_TEXT_PATH: z.string().optional(),
  ADS_GYANI_SEND_TEMPLATE_PATH: z.string().optional(),
  ADS_GYANI_TEMPLATE_LANGUAGE: z.string().optional(),
  WHATSAPP_WELCOME_TEMPLATE: z.string().optional(),
  WHATSAPP_OUTBOUND_TEMPLATE: z.string().optional(),
  WHATSAPP_SESSION_HOURS: z.coerce.number().default(24),
  WHATSAPP_TYPING_SIMULATION: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
  WHATSAPP_TYPING_MIN_MS: z.coerce.number().default(700),
  WHATSAPP_TYPING_MAX_MS: z.coerce.number().default(2200),
  SHOPIFY_STOREFRONT_URL: z.string().url().optional(),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_VISION_MODEL: z.string().default('gpt-4o'),
  OPENAI_TEXT_MODEL: z.string().default('gpt-4o'),
  OPENAI_WHISPER_MODEL: z.string().default('whisper-1'),
  PLANT_ID_API_KEY: z.string().optional(),

  INTERNAL_API_KEY: z.string().min(16),
  FARMER_JWT_SECRET: z.string().min(32),
  ADMIN_JWT_SECRET: z.string().min(32),
  ADMIN_UI_ORIGIN: z.string().optional(),
  /** Public URL of the staff portal SPA (no trailing slash), e.g. https://api.example.com/morbeez-staff */
  CONSOLE_PUBLIC_URL: z.string().url().optional(),
  /** @deprecated No longer used — staff set individual passwords */
  CONSOLE_SHARED_PASSWORD: z.string().min(8).max(128).optional(),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),

  ENABLE_SHIPROCKET_AUTO_SHIP: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  ENABLE_RAZORPAY_PAYMENT_LINKS: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  ENABLE_RAZORPAY_CHECKOUT: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
  CHECKOUT_SUCCESS_PATH: z.string().default('/pages/checkout-success'),
  ENABLE_WHATSAPP_AUTO_REPLY: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  /** OpenAI text replies for WhatsApp (greetings, general chat). Default on unless false. */
  ENABLE_WHATSAPP_OPENAI_REPLY: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
  ENABLE_OUTBOX_WORKER: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
  ENABLE_RETENTION_CLEANUP: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
  ENABLE_AI_CROP_DOCTOR: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  ENABLE_ADVISORY_FOLLOW_UPS: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  ENABLE_ADVISORY_AUTOMATION: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
  ENABLE_WHATSAPP_BROADCASTS: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
  WHATSAPP_BROADCAST_MAX_PER_DAY: z.coerce.number().default(2),
  WHATSAPP_BROADCAST_KIND_COOLDOWN_HOURS: z.coerce.number().default(72),
  ENABLE_WHATSAPP_ORDER_ALERTS: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
  ENABLE_CULTIVATION_FOLLOW_UPS: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
  CULTIVATION_APPLICATION_DAYS: z.coerce.number().default(5),
  CULTIVATION_RESULT_DAYS: z.coerce.number().default(10),
  ENABLE_AI_REUSE_CACHE: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
  AI_ESCALATION_THRESHOLD: z.coerce.number().min(0).max(1).default(0.65),
  AI_DAILY_TEXT_LIMIT_FREE: z.coerce.number().default(10),
  AI_DAILY_TEXT_LIMIT_PREMIUM: z.coerce.number().default(100),
  AI_DAILY_IMAGE_LIMIT_FREE: z.coerce.number().default(3),
  AI_DAILY_IMAGE_LIMIT_PREMIUM: z.coerce.number().default(50),
  AI_DAILY_VOICE_LIMIT_FREE: z.coerce.number().default(5),
  AI_DAILY_VOICE_LIMIT_PREMIUM: z.coerce.number().default(30),
  AI_MAX_VOICE_DURATION_SEC: z.coerce.number().default(60),
  AI_MIN_REQUEST_INTERVAL_SEC: z.coerce.number().default(30),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
