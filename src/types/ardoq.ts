// Ardoq API type definitions
// Based on: https://developer.ardoq.com/getting-started/making_a_simple_request/

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

