/** OAuth settings shared by the metadata, authorize and token endpoints. */

export const OAUTH_SCOPE = 'worklogs';
export const CODE_TTL_MS = 10 * 60 * 1000;

/** Where an app may send people back to: https, or http on this machine. */
export function isAllowedRedirect(uri: unknown): uri is string {
  if (typeof uri !== 'string' || uri.length > 500) return false;
  try {
    const url = new URL(uri);
    if (url.hash) return false;
    if (url.protocol === 'https:') return true;
    return (
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export const authServerMetadata = (origin: string) => ({
  issuer: origin,
  authorization_endpoint: `${origin}/oauth/authorize`,
  token_endpoint: `${origin}/api/oauth/token`,
  registration_endpoint: `${origin}/api/oauth/register`,
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code'],
  code_challenge_methods_supported: ['S256'],
  token_endpoint_auth_methods_supported: ['none'],
  scopes_supported: [OAUTH_SCOPE],
});
