"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ardoqClient = exports.ArdoqClient = void 0;
const axios_1 = __importDefault(require("axios"));
class ArdoqClient {
    constructor(config) {
        this.apiToken = '';
        this.apiHost = '';
        this.initialized = false;
        this.customConfig = null;
        if (config) {
            this.customConfig = config;
        }
        // Lazy initialization - will be initialized on first use
    }
    /**
     * Configure the client with specific credentials
     */
    configure(config) {
        this.customConfig = config;
        this.initialized = false; // Reset to allow re-initialization with new config
    }
    /**
     * Create a new client instance with specific configuration
     */
    static createWithConfig(config) {
        return new ArdoqClient(config);
    }
    initialize() {
        if (this.initialized) {
            return;
        }
        // Use custom config if provided, otherwise fall back to env vars
        if (this.customConfig) {
            this.apiToken = this.customConfig.apiToken;
            this.apiHost = this.customConfig.apiHost || 'https://app.ardoq.com';
            this.orgLabel = this.customConfig.orgLabel;
        }
        else {
            this.apiToken = process.env.ARDOQ_API_TOKEN || '';
            this.apiHost = process.env.ARDOQ_API_HOST || 'https://app.ardoq.com';
            this.orgLabel = process.env.ARDOQ_ORG_LABEL;
        }
        if (!this.apiToken) {
            throw new Error('ARDOQ_API_TOKEN is required. Provide it via configure() method or ARDOQ_API_TOKEN environment variable');
        }
        // Create axios instance with default config
        this.client = axios_1.default.create({
            baseURL: this.apiHost,
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'ArchBridge-SyncFlow-Server',
            },
        });
        // Add X-org header if org label is provided
        if (this.orgLabel) {
            this.client.defaults.headers.common['X-org'] = this.orgLabel;
        }
        // Add request interceptor for logging (optional)
        this.client.interceptors.request.use((config) => {
            if (process.env.NODE_ENV === 'development') {
                const hasAuth = !!config.headers?.['Authorization'];
                const hasAccept = config.headers?.['Accept'] === 'application/json';
                console.log(`[Ardoq API] ${config.method?.toUpperCase()} ${config.url}`, {
                    hasAuthHeader: hasAuth,
                    hasAcceptHeader: hasAccept,
                    headers: {
                        'Content-Type': config.headers?.['Content-Type'],
                        'Accept': config.headers?.['Accept'],
                        'X-org': config.headers?.['X-org'] || 'not set',
                    }
                });
            }
            return config;
        }, (error) => {
            return Promise.reject(error);
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => {
            // Check if response is HTML instead of JSON (common auth issue)
            const contentType = response.headers['content-type'] || '';
            const responseData = response.data;
            // Check for HTML content type or HTML-like content
            const isHtml = contentType.includes('text/html') ||
                (typeof responseData === 'string' && (responseData.trim().startsWith('<!') ||
                    responseData.trim().startsWith('<html') ||
                    responseData.toLowerCase().includes('<!doctype html')));
            if (isHtml) {
                const preview = typeof responseData === 'string'
                    ? responseData.substring(0, 500).replace(/\s+/g, ' ').trim()
                    : JSON.stringify(responseData).substring(0, 500);
                console.error('[Ardoq API] Received HTML response instead of JSON:', {
                    url: response.config.url,
                    status: response.status,
                    contentType,
                    preview
                });
                const htmlError = {
                    error: 'HTML response received - authentication may have failed',
                    message: 'The Ardoq API returned HTML instead of JSON. This usually indicates an authentication issue. Please verify your API token is valid and not expired. Check the server logs for more details.',
                    statusCode: response.status,
                };
                return Promise.reject(htmlError);
            }
            return response;
        }, (error) => {
            // Check if error response is HTML
            const contentType = error.response?.headers['content-type'] || '';
            const responseData = error.response?.data;
            // Check for HTML content type or HTML-like content
            const isHtml = contentType.includes('text/html') ||
                (typeof responseData === 'string' && (responseData.trim().startsWith('<!') ||
                    responseData.trim().startsWith('<html') ||
                    responseData.toLowerCase().includes('<!doctype html')));
            if (isHtml) {
                const preview = typeof responseData === 'string'
                    ? responseData.substring(0, 500).replace(/\s+/g, ' ').trim()
                    : JSON.stringify(responseData).substring(0, 500);
                console.error('[Ardoq API] Error response is HTML:', {
                    url: error.config?.url,
                    status: error.response?.status,
                    contentType,
                    preview
                });
                const htmlError = {
                    error: 'HTML error response received',
                    message: `The Ardoq API returned HTML (likely a login/error page) instead of JSON. Status: ${error.response?.status || 'Unknown'}. This usually indicates an authentication failure - please verify your API token is valid and not expired. Check the server logs for response preview.`,
                    statusCode: error.response?.status,
                };
                return Promise.reject(htmlError);
            }
            const ardoqError = {
                error: error.message,
                message: error.response?.data?.message || error.message,
                statusCode: error.response?.status,
            };
            return Promise.reject(ardoqError);
        });
        this.initialized = true;
    }
    /**
     * Make a request to the Ardoq API
     * @param path - API endpoint path (e.g., '/api/v2/me')
     * @param options - Request options (method, queryParams, data)
     * @returns Promise with the response data
     */
    async request(path, options = {}) {
        this.initialize(); // Ensure client is initialized
        const { method = 'GET', queryParams, data } = options;
        const config = {
            method,
            url: path,
            params: queryParams,
            data,
        };
        try {
            const response = await this.client.request(config);
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const ardoqError = error;
                throw ardoqError;
            }
            throw error;
        }
    }
    /**
     * GET request helper
     */
    async get(path, queryParams) {
        return this.request(path, { method: 'GET', queryParams });
    }
    /**
     * POST request helper
     */
    async post(path, data) {
        return this.request(path, { method: 'POST', data });
    }
    /**
     * PUT request helper
     */
    async put(path, data) {
        return this.request(path, { method: 'PUT', data });
    }
    /**
     * PATCH request helper
     */
    async patch(path, data) {
        return this.request(path, { method: 'PATCH', data });
    }
    /**
     * DELETE request helper
     */
    async delete(path) {
        return this.request(path, { method: 'DELETE' });
    }
    /**
     * Get API configuration info (for debugging)
     */
    getConfig() {
        return {
            apiHost: this.apiHost || process.env.ARDOQ_API_HOST || 'https://app.ardoq.com',
            orgLabel: this.orgLabel || process.env.ARDOQ_ORG_LABEL || 'not set',
            hasToken: !!this.apiToken || !!process.env.ARDOQ_API_TOKEN,
            initialized: this.initialized,
        };
    }
}
exports.ArdoqClient = ArdoqClient;
// Export singleton instance
exports.ardoqClient = new ArdoqClient();
//# sourceMappingURL=ardoqClient.js.map