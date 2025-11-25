import { AzureDevOpsRequestOptions, AzureDevOpsClientConfig } from "../types/azureDevOps";
/**
 * Azure DevOps API Client
 * Handles all communication with the Azure DevOps REST API
 * Documentation: https://docs.microsoft.com/en-us/rest/api/azure/devops/
 */
export declare class AzureDevOpsClient {
    private client;
    private patToken;
    private organization;
    private initialized;
    private customConfig;
    constructor(config?: AzureDevOpsClientConfig);
    /**
     * Configure the client with specific credentials
     */
    configure(config: AzureDevOpsClientConfig): void;
    /**
     * Create a new client instance with specific configuration
     */
    static createWithConfig(config: AzureDevOpsClientConfig): AzureDevOpsClient;
    /**
     * Encode PAT token for Basic authentication
     * Format: base64(':PAT_TOKEN')
     */
    private encodePatToken;
    private initialize;
    /**
     * Make a request to the Azure DevOps API
     * @param path - API endpoint path (e.g., '/_apis/profile/profiles/me?api-version=6.0')
     * @param options - Request options (method, queryParams, data)
     * @returns Promise with the response data
     */
    request<T = any>(path: string, options?: AzureDevOpsRequestOptions): Promise<T>;
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
     * Create a work item using JSON Patch format
     * @param project - Project ID or name
     * @param workItemType - Work item type (e.g., "$Epic", "$Feature", "$User Story")
     * @param patchDocument - JSON Patch document array
     * @returns Created work item response
     */
    createWorkItem(project: string, workItemType: string, patchDocument: any[]): Promise<any>;
    /**
     * Get available process templates for the organization
     * @returns Array of process template definitions
     */
    getProcesses(): Promise<any[]>;
    /**
     * Get the Agile process template ID
     * @returns The typeId of the Agile process template, or null if not found
     */
    getAgileProcessTemplateId(): Promise<string | null>;
    /**
     * List all projects in the organization
     * @returns Projects list response with value array containing project details
     */
    listProjects(): Promise<any>;
    /**
     * Query work items using WIQL (Work Item Query Language)
     * @param project - Project ID or name
     * @param wiql - WIQL query string
     * @returns Work item query result with workItems array
     */
    queryWorkItems(project: string, wiql: string): Promise<any>;
    /**
     * Delete work items from a project
     * @param project - Project ID or name
     * @param workItemIds - Array of work item IDs to delete
     * @param destroy - If true, permanently deletes work items. If false, moves them to recycle bin (default: false)
     * @returns Delete operation response
     */
    deleteWorkItems(project: string, workItemIds: number[], destroy?: boolean): Promise<any>;
    /**
     * Get API configuration info (for debugging)
     */
    getConfig(): {
        organization: string;
        hasToken: boolean;
        initialized: boolean;
    };
}
export declare const azureDevOpsClient: AzureDevOpsClient;
//# sourceMappingURL=azureDevOpsClient.d.ts.map