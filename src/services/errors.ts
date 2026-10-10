export type ServiceErrorCode = 'unauthenticated' | 'forbidden' | 'not_found' | 'invalid' | 'conflict' | 'upstream';

const STATUS: Record<ServiceErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  invalid: 422,
  conflict: 409,
  upstream: 502,
};

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly status: number;

  constructor(code: ServiceErrorCode, message: string) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.status = STATUS[code];
  }
}

export interface ApiError {
  status: number;
  code: ServiceErrorCode;
  message: string;
}

export const toApiError = (error: unknown): ApiError =>
  error instanceof ServiceError
    ? { status: error.status, code: error.code, message: error.message }
    : { status: 500, code: 'upstream', message: error instanceof Error ? error.message : String(error) };
