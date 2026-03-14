export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function parseSupabaseError(error: { message: string; code?: string }): AppError {
  switch (error.code) {
    case 'PGRST116':
      return new AppError('NOT_FOUND', 'Resource not found.', 404);
    case '23505':
      return new AppError('DUPLICATE', 'This record already exists.', 409);
    case '42501':
      return new AppError('FORBIDDEN', 'You do not have permission to perform this action.', 403);
    default:
      return new AppError('UNKNOWN', error.message);
  }
}
