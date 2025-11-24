// Custom type definitions
// Add your custom types and interfaces here

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

