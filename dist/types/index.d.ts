export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}
export interface HealthCheckResponse {
    status: string;
    timestamp: string;
    service?: string;
}
//# sourceMappingURL=index.d.ts.map