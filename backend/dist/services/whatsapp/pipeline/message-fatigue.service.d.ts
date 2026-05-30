/**
 * Reduces proactive WhatsApp noise when farmers repeatedly ignore outbound messages.
 */
export declare const messageFatigueService: {
    getEngagementLevel(farmerId: string): Promise<"high" | "medium" | "low">;
    shouldReduceProactiveMessages(farmerId: string): Promise<boolean>;
};
//# sourceMappingURL=message-fatigue.service.d.ts.map