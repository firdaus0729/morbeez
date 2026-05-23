# M2 — Future Scalability (M3+)

## Reserved without rewrite

| Capability | M2 hook |
|------------|---------|
| OpenAI / GPT-4o | `event_outbox`, `ai_advisory_logs` table planned |
| Plant.id | New `services/plantid/` |
| Whisper | WhatsApp audio `message.type` handler |
| Mobile apps | Same `/api/v1` + Supabase RLS |
| Zoho CRM | `crm_sync_queue` |
| AI recommendations | Shopify metafields + `recommendation_history` |
| Affiliate | `farmers.metadata.affiliate_code` |
| Multilingual AI | `preferred_language` on farmers |

## Scale triggers

| Trigger | Action |
|---------|--------|
| >500 webhooks/min | BullMQ + Redis on Railway |
| >50k farmers | Read replicas, partition interaction_logs |
| Multiple regions | Supabase region + CDN |

## API evolution

- GraphQL gateway optional for mobile
- Storefront API for product reads stays on Shopify
