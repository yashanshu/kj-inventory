// API response wrapper types

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function isApiError(response: any): response is ApiErrorResponse {
  return response && 'error' in response;
}
