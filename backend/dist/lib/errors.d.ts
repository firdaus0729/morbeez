export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly details?: unknown | undefined;
    constructor(message: string, statusCode?: number, code?: string, details?: unknown | undefined);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: unknown);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string);
}
export declare class WebhookVerificationError extends AppError {
    constructor(provider: string);
}
//# sourceMappingURL=errors.d.ts.map