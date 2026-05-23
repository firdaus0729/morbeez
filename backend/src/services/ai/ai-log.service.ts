import { supabase } from '../../lib/supabase.js';

export const aiLogService = {
  async logRequest(params: {
    sessionId?: string;
    provider: string;
    endpoint: string;
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await supabase.from('ai_request_logs').insert({
      session_id: params.sessionId ?? null,
      provider: params.provider,
      endpoint: params.endpoint,
      latency_ms: params.latencyMs,
      success: params.success,
      error_message: params.errorMessage ?? null,
      metadata: params.metadata ?? {},
    });
  },
};
