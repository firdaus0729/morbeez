/**
 * OpenAI chat models split on token limit parameter names:
 * - gpt-4o, gpt-4-turbo, etc. → max_tokens
 * - o1/o3/gpt-5 family → max_completion_tokens
 */
export declare function openaiUsesMaxCompletionTokens(model: string): boolean;
export declare function openaiTokenLimitBody(model: string, limit: number): Record<string, number>;
//# sourceMappingURL=openai-chat-params.d.ts.map