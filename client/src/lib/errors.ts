/**
 * Extracts a human-friendly message from an axios error or a plain Error.
 * Local (localStorage) data-source errors are plain Errors with a message, so
 * this keeps their cause visible in toasts and inline validation.
 */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as {
      response?: { data?: { message?: string } };
    }).response;
    const message = response?.data?.message;
    if (message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
