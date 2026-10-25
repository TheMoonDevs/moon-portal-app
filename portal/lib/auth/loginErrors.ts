/** Error codes returned by the sign-in provider, shared with the login UI. */
export const LOGIN_ERRORS = {
  INVALID_CODE: 'INVALID_CODE',
  GOOGLE_FAILED: 'GOOGLE_FAILED',
  EMAIL_NOT_LINKED: 'EMAIL_NOT_LINKED',
  INACTIVE: 'INACTIVE',
} as const;

export const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  [LOGIN_ERRORS.INVALID_CODE]: 'That code doesn’t match. Please try again.',
  [LOGIN_ERRORS.GOOGLE_FAILED]:
    'Google sign-in didn’t go through. Please try again.',
  [LOGIN_ERRORS.EMAIL_NOT_LINKED]:
    'That Google account isn’t linked to this code. Pick another account, or ask an admin to link it.',
  [LOGIN_ERRORS.INACTIVE]: 'This account is inactive. Please contact an admin.',
};
