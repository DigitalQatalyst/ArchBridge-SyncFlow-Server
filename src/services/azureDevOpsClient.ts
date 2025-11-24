import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from "axios";
import {
  AzureDevOpsRequestOptions,
  AzureDevOpsApiError,
  AzureDevOpsClientConfig,
} from "../types/azureDevOps";

/**
 * Azure DevOps API Client
 * Handles all communication with the Azure DevOps REST API
 * Documentation: https://docs.microsoft.com/en-us/rest/api/azure/devops/
 */
export class AzureDevOpsClient {
  private client!: AxiosInstance;
  private patToken: string = "";
  private organization: string = "";

  private initialized: boolean = false;
  private customConfig: AzureDevOpsClientConfig | null = null;

  constructor(config?: AzureDevOpsClientConfig) {
    if (config) {
      this.customConfig = config;
    }
    // Lazy initialization - will be initialized on first use
  }

  /**
   * Configure the client with specific credentials
   */
  configure(config: AzureDevOpsClientConfig): void {
    this.customConfig = config;
    this.initialized = false; // Reset to allow re-initialization with new config
  }

  /**
   * Create a new client instance with specific configuration
   */
  static createWithConfig(config: AzureDevOpsClientConfig): AzureDevOpsClient {
    return new AzureDevOpsClient(config);
  }

  /**
   * Encode PAT token for Basic authentication
   * Format: base64(':PAT_TOKEN')
   */
  private encodePatToken(patToken: string): string {
    const token = `:${patToken}`;
    return Buffer.from(token).toString("base64");
  }

  private initialize(): void {
    if (this.initialized) {
      return;
    }

    // Use custom config if provided, otherwise fall back to env vars
    if (this.customConfig) {
      this.patToken = this.customConfig.patToken;
      this.organization = this.customConfig.organization;
    } else {
      this.patToken = process.env.AZURE_DEVOPS_PAT_TOKEN || "";
      this.organization = process.env.AZURE_DEVOPS_ORGANIZATION || "";
    }

    if (!this.patToken) {
      throw new Error(
        "PAT token is required. Provide it via configure() method or AZURE_DEVOPS_PAT_TOKEN environment variable"
      );
    }

    if (!this.organization) {
      throw new Error(
        "Organization is required. Provide it via configure() method or AZURE_DEVOPS_ORGANIZATION environment variable"
      );
    }

    // Create axios instance with default config
    const baseURL = `https://dev.azure.com/${this.organization}`;
    const authToken = this.encodePatToken(this.patToken);

    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Basic ${authToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "ArchBridge-SyncFlow-Server",
      },
    });

    // Add request interceptor for logging (optional)
    this.client.interceptors.request.use(
      (config) => {
        if (process.env.NODE_ENV === "development") {
          const hasAuth = !!config.headers?.["Authorization"];
          const hasAccept = config.headers?.["Accept"] === "application/json";
          console.log(
            `[Azure DevOps API] ${config.method?.toUpperCase()} ${config.url}`,
            {
              hasAuthHeader: hasAuth,
              hasAcceptHeader: hasAccept,
              organization: this.organization,
              headers: {
                "Content-Type": config.headers?.["Content-Type"],
                Accept: config.headers?.["Accept"],
              },
            }
          );
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
        const contentType = response.headers["content-type"] || "";
        const responseData = response.data;

        // Check for HTML content type or HTML-like content
        const isHtml =
          contentType.includes("text/html") ||
          (typeof responseData === "string" &&
            (responseData.trim().startsWith("<!") ||
              responseData.trim().startsWith("<html") ||
              responseData.toLowerCase().includes("<!doctype html")));

        if (isHtml) {
          const preview =
            typeof responseData === "string"
              ? responseData.substring(0, 500).replace(/\s+/g, " ").trim()
              : JSON.stringify(responseData).substring(0, 500);

          console.error(
            "[Azure DevOps API] Received HTML response instead of JSON:",
            {
              url: response.config.url,
              status: response.status,
              contentType,
              preview,
            }
          );

          const htmlError: AzureDevOpsApiError = {
            error: "HTML response received - authentication may have failed",
            message:
              "The Azure DevOps API returned HTML instead of JSON. This usually indicates an authentication issue. Please verify your PAT token is valid and not expired. Check the server logs for more details.",
            statusCode: response.status,
          };
          return Promise.reject(htmlError);
        }

        return response;
      },
      (error: AxiosError) => {
        // Check if error response is HTML
        const contentType = error.response?.headers["content-type"] || "";
        const responseData = error.response?.data;

        // Check for HTML content type or HTML-like content
        const isHtml =
          contentType.includes("text/html") ||
          (typeof responseData === "string" &&
            (responseData.trim().startsWith("<!") ||
              responseData.trim().startsWith("<html") ||
              responseData.toLowerCase().includes("<!doctype html")));

        if (isHtml) {
          const preview =
            typeof responseData === "string"
              ? responseData.substring(0, 500).replace(/\s+/g, " ").trim()
              : JSON.stringify(responseData).substring(0, 500);

          console.error("[Azure DevOps API] Error response is HTML:", {
            url: error.config?.url,
            status: error.response?.status,
            contentType,
            preview,
          });

          const htmlError: AzureDevOpsApiError = {
            error: "HTML error response received",
            message: `The Azure DevOps API returned HTML (likely a login/error page) instead of JSON. Status: ${
              error.response?.status || "Unknown"
            }. This usually indicates an authentication failure - please verify your PAT token is valid and not expired. Check the server logs for response preview.`,
            statusCode: error.response?.status,
          };
          return Promise.reject(htmlError);
        }

        const azureDevOpsError: AzureDevOpsApiError = {
          error: error.message,
          message: (error.response?.data as any)?.message || error.message,
          statusCode: error.response?.status,
        };
        return Promise.reject(azureDevOpsError);
      }
    );

    this.initialized = true;
  }

  /**
   * Make a request to the Azure DevOps API
   * @param path - API endpoint path (e.g., '/_apis/profile/profiles/me?api-version=6.0')
   * @param options - Request options (method, queryParams, data)
   * @returns Promise with the response data
   */
  async request<T = any>(
    path: string,
    options: AzureDevOpsRequestOptions = {}
  ): Promise<T> {
    this.initialize(); // Ensure client is initialized
    const { method = "GET", queryParams, data } = options;

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
        const azureDevOpsError = error as any as AzureDevOpsApiError;
        throw azureDevOpsError;
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
    return this.request<T>(path, { method: "GET", queryParams });
  }

  /**
   * POST request helper
   */
  async post<T = any>(path: string, data?: any): Promise<T> {
    return this.request<T>(path, { method: "POST", data });
  }

  /**
   * PUT request helper
   */
  async put<T = any>(path: string, data?: any): Promise<T> {
    return this.request<T>(path, { method: "PUT", data });
  }

  /**
   * PATCH request helper
   */
  async patch<T = any>(path: string, data?: any): Promise<T> {
    return this.request<T>(path, { method: "PATCH", data });
  }

  /**
   * DELETE request helper
   */
  async delete<T = any>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  /**
   * Create a work item using JSON Patch format
   * @param project - Project ID or name
   * @param workItemType - Work item type (e.g., "$Epic", "$Feature", "$User Story")
   * @param patchDocument - JSON Patch document array
   * @returns Created work item response
   */
  async createWorkItem(
    project: string,
    workItemType: string,
    patchDocument: any[]
  ): Promise<any> {
    this.initialize();

    // Work items API requires application/json-patch+json content type
    // Path format: /{organization}/{project}/_apis/wit/workitems/{type}?api-version=7.1
    const path = `${project}/_apis/wit/workitems/${encodeURIComponent(
      workItemType
    )}?api-version=7.1`;

    // Create a temporary axios instance with JSON Patch content type
    const config: AxiosRequestConfig = {
      method: "POST",
      url: path,
      data: patchDocument,
      headers: {
        "Content-Type": "application/json-patch+json",
        Authorization: `Basic ${this.encodePatToken(this.patToken)}`,
        Accept: "application/json",
      },
    };

    try {
      const response = await this.client.request(config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const azureDevOpsError = error as any as AzureDevOpsApiError;
        throw azureDevOpsError;
      }
      throw error;
    }
  }

  /**
   * Get available process templates for the organization
   * @returns Array of process template definitions
   */
  async getProcesses(): Promise<any[]> {
    this.initialize();
    const path = "/_apis/work/processes?api-version=7.1";
    const response = await this.get<any>(path);
    return response.value || [];
  }

  /**
   * Get the Agile process template ID
   * @returns The typeId of the Agile process template, or null if not found
   */
  async getAgileProcessTemplateId(): Promise<string | null> {
    try {
      const processes = await this.getProcesses();
      const agileProcess = processes.find(
        (p) => p.name && p.name.toLowerCase() === "agile"
      );
      return agileProcess?.typeId || null;
    } catch (error) {
      console.error("Failed to get Agile process template ID:", error);
      return null;
    }
  }

  /**
   * List all projects in the organization
   * @returns Projects list response with value array containing project details
   */
  async listProjects(): Promise<any> {
    this.initialize();
    const path = "/_apis/projects?api-version=7.1";
    return this.get<any>(path);
  }

  /**
   * Query work items using WIQL (Work Item Query Language)
   * @param project - Project ID or name
   * @param wiql - WIQL query string
   * @returns Work item query result with workItems array
   */
  async queryWorkItems(project: string, wiql: string): Promise<any> {
    this.initialize();
    const path = `${project}/_apis/wit/wiql?api-version=7.1`;
    const requestBody = { query: wiql };
    return this.post<any>(path, requestBody);
  }

  /**
   * Delete work items from a project
   * @param project - Project ID or name
   * @param workItemIds - Array of work item IDs to delete
   * @param destroy - If true, permanently deletes work items. If false, moves them to recycle bin (default: false)
   * @returns Delete operation response
   */
  async deleteWorkItems(
    project: string,
    workItemIds: number[],
    destroy: boolean = false
  ): Promise<any> {
    this.initialize();
    const path = `${project}/_apis/wit/workitemsdelete?api-version=7.1`;
    const requestBody = {
      ids: workItemIds,
      destroy: destroy,
    };
    return this.post<any>(path, requestBody);
  }

  /**
   * Get API configuration info (for debugging)
   */
  getConfig() {
    return {
      organization:
        this.organization || process.env.AZURE_DEVOPS_ORGANIZATION || "not set",
      hasToken: !!this.patToken || !!process.env.AZURE_DEVOPS_PAT_TOKEN,
      initialized: this.initialized,
    };
  }
}

// Export singleton instance
export const azureDevOpsClient = new AzureDevOpsClient();
