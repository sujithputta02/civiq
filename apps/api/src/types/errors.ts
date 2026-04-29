/**
 * Custom error types for the API
 */

export interface ApiError extends Error {
  name: string;
  message: string;
}

export interface ZodError extends ApiError {
  name: 'ZodError';
}

export function isZodError(error: unknown): error is ZodError {
  if (error instanceof Error && error.name === 'ZodError') {
    return true;
  }
  // Also check for objects with issues property (duck typing for Zod errors)
  if (error && typeof error === 'object' && 'issues' in error) {
    return true;
  }
  return false;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message !== undefined) {
      return error.message;
    }
    return 'Unknown error occurred';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as Record<string, unknown>).message;
    if (typeof msg === 'string') {
      return msg;
    }
  }
  return 'Unknown error occurred';
}
