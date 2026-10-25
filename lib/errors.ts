/** The raw database / API error behind an AppError — logged, never shown to customers. */
export interface SourceError {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

export class AppError extends Error {
  /** Set by parseSupabaseError: what the server actually said. */
  public sourceError?: SourceError;

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

export function parseSupabaseError(error: { message: string; code?: string; details?: string | null; hint?: string | null }): AppError {
  const appError = toAppError(error);
  // Keep the server's own words for the error log; customers only see appError.message.
  appError.sourceError = { code: error.code, message: error.message, details: error.details ?? null, hint: error.hint ?? null };
  return appError;
}

function toAppError(error: { message: string; code?: string }): AppError {
  // PostgREST / DB error codes
  switch (error.code) {
    case 'PGRST116':
      return new AppError('NOT_FOUND', 'Resource not found.', 404);
    case '23505':
      return new AppError('DUPLICATE', 'This record already exists.', 409);
    case '23503':
      return new AppError('FK_VIOLATION', 'This record is referenced by other records.', 409);
    case '42501':
      return new AppError('FORBIDDEN', 'You do not have permission to perform this action.', 403);
  }

  // GoTrue / Auth error codes (supabase-js v2 sets error.code for auth errors)
  switch (error.code) {
    case 'invalid_credentials':
      return new AppError('INVALID_CREDENTIALS', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', 400);
    case 'email_not_confirmed':
      return new AppError('EMAIL_NOT_CONFIRMED', 'يرجى تأكيد البريد الإلكتروني أولاً.', 400);
    case 'user_not_found':
      return new AppError('USER_NOT_FOUND', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', 400);
    case 'email_taken':
    case 'email_address_already_registered':
      return new AppError('EMAIL_TAKEN', 'هذا البريد الإلكتروني مسجل مسبقاً.', 409);
    case 'weak_password':
      return new AppError('WEAK_PASSWORD', 'كلمة المرور ضعيفة جداً. يجب أن تكون 6 أحرف على الأقل.', 422);
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return new AppError('RATE_LIMIT', 'محاولات كثيرة. يرجى الانتظار قبل المحاولة مجدداً.', 429);
    case 'email_address_invalid':
      return new AppError('EMAIL_INVALID', 'البريد الإلكتروني غير صحيح.', 400);
  }

  // Auth service couldn't send the email (SMTP login/connection failed on the server)
  const authMsg = error.message?.toLowerCase() ?? '';
  if (authMsg.includes('error sending') || authMsg.includes('smtp')) {
    return new AppError('EMAIL_SEND_FAILED', 'تعذّر إرسال البريد الإلكتروني حالياً. يرجى المحاولة لاحقاً أو التواصل معنا.', 500);
  }
  if (authMsg.includes('rate limit')) {
    return new AppError('RATE_LIMIT', 'محاولات كثيرة. يرجى الانتظار قبل المحاولة مجدداً.', 429);
  }

  // Fallback: match on message text for older GoTrue versions that don't set code
  const msg = error.message?.toLowerCase() ?? '';
  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
    return new AppError('INVALID_CREDENTIALS', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', 400);
  }
  if (msg.includes('email not confirmed')) {
    return new AppError('EMAIL_NOT_CONFIRMED', 'يرجى تأكيد البريد الإلكتروني أولاً.', 400);
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return new AppError('EMAIL_TAKEN', 'هذا البريد الإلكتروني مسجل مسبقاً.', 409);
  }

  // Do not forward raw DB / PostgREST error messages to the client —
  // they can reveal schema details. Use a generic message instead.
  return new AppError('UNKNOWN', 'حدث خطأ غير متوقع. يرجى المحاولة مجدداً.');
}
