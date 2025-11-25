export interface AzureDevOpsApiError {
    error: string;
    message?: string;
    statusCode?: number;
}
export interface AzureDevOpsRequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    queryParams?: Record<string, string | number | boolean>;
    data?: any;
}
export interface AzureDevOpsClientConfig {
    patToken: string;
    organization: string;
}
export interface AzureDevOpsConfiguration {
    id: string;
    name: string;
    organization: string;
    patToken: string;
    createdAt: string;
    updatedAt: string;
    isActive?: boolean;
    isTested?: boolean;
    testPassed?: boolean;
    testError?: string;
}
//# sourceMappingURL=azureDevOps.d.ts.map