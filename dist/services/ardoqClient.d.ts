import { ArdoqRequestOptions } from '../types/ardoq';
/**
 * Ardoq API Client
 * Handles all communication with the Ardoq REST API
 * Documentation: https://developer.ardoq.com/getting-started/making_a_simple_request/
 */
export interface ArdoqClientConfig {
    apiToken: string;
    apiHost?: string;
    orgLabel?: string;
}
export declare class ArdoqClient {
    private client;
    private apiToken;
    private apiHost;
    private orgLabel;
    private initialized;
    private customConfig;
    constructor(config?: ArdoqClientConfig);
    /**
     * Configure the client with specific credentials
     */
    configure(config: ArdoqClientConfig): void;
    /**
     * Create a new client instance with specific configuration
     */
    static createWithConfig(config: ArdoqClientConfig): ArdoqClient;
    private initialize;
    /**
     * Make a request to the Ardoq API
     * @param path - API endpoint path (e.g., '/api/v2/me')
     * @param options - Request options (method, queryParams, data)
     * @returns Promise with the response data
     */
    request<T = any>(path: string, options?: ArdoqRequestOptions): Promise<T>;
    /**
     * GET request helper
     */
    get<T = any>(path: string, queryParams?: Record<string, string | number | boolean>): Promise<T>;
    /**
     * POST request helper
     */
    post<T = any>(path: string, data?: any): Promise<T>;
    /**
     * PUT request helper
     */
    put<T = any>(path: string, data?: any): Promise<T>;
    /**
     * PATCH request helper
     */
    patch<T = any>(path: string, data?: any): Promise<T>;
    /**
     * DELETE request helper
     */
    delete<T = any>(path: string): Promise<T>;
    /**
     * Get API configuration info (for debugging)
     */
    getConfig(): {
        apiHost: string;
        orgLabel: string;
        hasToken: boolean;
        initialized: boolean;
    };
}
export declare const ardoqClient: ArdoqClient;
//# sourceMappingURL=ardoqClient.d.ts.map