export type GuardResult = {
    allowed: true;
} | {
    allowed: false;
    reason: string;
};
export declare function validateAgricultureIntent(params: {
    text: string;
    hasCropMedia: boolean;
}): GuardResult;
export declare function guardRejectionMessage(language: string): string;
//# sourceMappingURL=agriculture-guard.service.d.ts.map