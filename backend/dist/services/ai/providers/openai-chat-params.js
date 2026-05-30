/**
 * OpenAI chat models split on token limit parameter names:
 * - gpt-4o, gpt-4-turbo, etc. → max_tokens
 * - o1/o3/gpt-5 family → max_completion_tokens
 */
export function openaiUsesMaxCompletionTokens(model) {
    const m = model.trim().toLowerCase();
    return /^o\d/.test(m) || /^gpt-5/.test(m) || m.includes('reasoning');
}
export function openaiTokenLimitBody(model, limit) {
    if (openaiUsesMaxCompletionTokens(model)) {
        return { max_completion_tokens: limit };
    }
    return { max_tokens: limit };
}
//# sourceMappingURL=openai-chat-params.js.map