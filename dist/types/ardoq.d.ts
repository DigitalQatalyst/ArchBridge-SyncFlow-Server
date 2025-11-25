export interface ArdoqApiError {
    error: string;
    message?: string;
    statusCode?: number;
}
export interface ArdoqRequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    queryParams?: Record<string, string | number | boolean>;
    data?: any;
}
//# sourceMappingURL=ardoq.d.ts.map