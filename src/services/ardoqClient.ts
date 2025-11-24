import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { ArdoqRequestOptions, ArdoqApiError } from '../types/ardoq';

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

export class ArdoqClient {
  private client!: AxiosInstance;
  private apiToken: string = '';
  private apiHost: string = '';
  private orgLabel: string | undefined;

  private initialized: boolean = false;
  private customConfig: ArdoqClientConfig | null = null;

  constructor(config?: ArdoqClientConfig) {
    if (config) {
      this.customConfig = config;
    }
    // Lazy initialization - will be initialized on first use
  }

  /**
   * Configure the client with specific credentials
   */
  configure(config: ArdoqClientConfig): void {
    this.customConfig = config;
    this.initialized = false; // Reset to allow re-initialization with new config
  }

  /**
   * Create a new client instance with specific configuration
   */
  static createWithConfig(config: ArdoqClientConfig): ArdoqClient {
    return new ArdoqClient(config);
  }

  private initialize(): void {
    if (this.initialized) {
      return;
    }

    // Use custom config if provided, otherwise fall back to env vars
    if (this.customConfig) {
      this.apiToken = this.customConfig.apiToken;
      this.apiHost = this.customConfig.apiHost || 'https://app.ardoq.com';
      this.orgLabel = this.customConfig.orgLabel;
    } else {
      this.apiToken = process.env.ARDOQ_API_TOKEN || '';
      this.apiHost = process.env.ARDOQ_API_HOST || 'https://app.ardoq.com';
      this.orgLabel = process.env.ARDOQ_ORG_LABEL;
    }

    if (!this.apiToken) {
      throw new Error('ARDOQ_API_TOKEN is required. Provide it via configure() method or ARDOQ_API_TOKEN environment variable');
    }

    // Create axios instance with default config
    this.client = axios.create({
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
    this.client.interceptors.request.use(
      (config) => {
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
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        // Check if response is HTML instead of JSON (common auth issue)
        const contentType = response.headers['content-type'] || '';
        const responseData = response.data;
        
        // Check for HTML content type or HTML-like content
        const isHtml = contentType.includes('text/html') || 
                       (typeof responseData === 'string' && (
                         responseData.trim().startsWith('<!') ||
                         responseData.trim().startsWith('<html') ||
                         responseData.toLowerCase().includes('<!doctype html')
                       ));
        
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
          
          const htmlError: ArdoqApiError = {
            error: 'HTML response received - authentication may have failed',
            message: 'The Ardoq API returned HTML instead of JSON. This usually indicates an authentication issue. Please verify your API token is valid and not expired. Check the server logs for more details.',
            statusCode: response.status,
          };
          return Promise.reject(htmlError);
        }
        
        return response;
      },
      (error: AxiosError) => {
        // Check if error response is HTML
        const contentType = error.response?.headers['content-type'] || '';
        const responseData = error.response?.data;
        
        // Check for HTML content type or HTML-like content
        const isHtml = contentType.includes('text/html') || 
                       (typeof responseData === 'string' && (
                         responseData.trim().startsWith('<!') ||
                         responseData.trim().startsWith('<html') ||
                         responseData.toLowerCase().includes('<!doctype html')
                       ));
        
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
          
          const htmlError: ArdoqApiError = {
            error: 'HTML error response received',
            message: `The Ardoq API returned HTML (likely a login/error page) instead of JSON. Status: ${error.response?.status || 'Unknown'}. This usually indicates an authentication failure - please verify your API token is valid and not expired. Check the server logs for response preview.`,
            statusCode: error.response?.status,
          };
          return Promise.reject(htmlError);
        }
        
        const ardoqError: ArdoqApiError = {
          error: error.message,
          message: (error.response?.data as any)?.message || error.message,
          statusCode: error.response?.status,
        };
        return Promise.reject(ardoqError);
      }
    );

    this.initialized = true;
  }

  /**
   * Make a request to the Ardoq API
   * @param path - API endpoint path (e.g., '/api/v2/me')
   * @param options - Request options (method, queryParams, data)
   * @returns Promise with the response data
   */
  async request<T = any>(
    path: string,
    options: ArdoqRequestOptions = {}
  ): Promise<T> {
    this.initialize(); // Ensure client is initialized
    const { method = 'GET', queryParams, data } = options;

    const config: AxiosRequestConfig = {
      method,
      url: path,
      params: queryParams,
      data,
    };

    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const ardoqError = error as any as ArdoqApiError;
        throw ardoqError;
      }
      throw error;
    }
  }

  /**
   * GET request helper
   */
  async get<T = any>(
    path: string,
    queryParams?: Record<string, string | number | boolean>
  ): Promise<T> {
    return this.request<T>(path, { method: 'GET', queryParams });
  }

  /**
   * POST request helper
   */
  async post<T = any>(path: string, data?: any): Promise<T> {
    return this.request<T>(path, { method: 'POST', data });
  }

  /**
   * PUT request helper
   */
  async put<T = any>(path: string, data?: any): Promise<T> {
    return this.request<T>(path, { method: 'PUT', data });
  }

  /**
   * PATCH request helper
   */
  async patch<T = any>(path: string, data?: any): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', data });
  }

  /**
   * DELETE request helper
   */
  async delete<T = any>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
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

// Export singleton instance
export const ardoqClient = new ArdoqClient();

