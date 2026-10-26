import {
  type BaseModel,
  createCrudSchemas,
  type Loose,
  type Nullable,
} from './shared/base';

/*
 * How AI assistants (Claude and others) act for a person through the portal's
 * MCP server. Only hashes of secrets are stored.
 */

/** A personal access token. Apps connected through OAuth get one too. */
export type ApiToken = Loose<
  BaseModel & {
    userId: string;
    /** Shown in Settings, e.g. "Claude" or the name a person typed. */
    name: string;
    /** sha256 of the token. */
    tokenHash: string;
    /** The first characters, so people can tell tokens apart. */
    prefix: string;
    /** Set when the token came from an OAuth connection. */
    clientId?: Nullable<string>;
    expiresAt?: Nullable<string>;
    lastUsedAt?: Nullable<string>;
    revokedAt?: Nullable<string>;
  }
>;

/** An app registered itself to connect (OAuth dynamic client registration). */
export type OAuthClient = Loose<
  BaseModel & {
    clientId: string;
    name: string;
    redirectUris: string[];
  }
>;

/** A one-time sign-in code, swapped for a token within minutes. */
export type OAuthCode = Loose<
  BaseModel & {
    codeHash: string;
    clientId: string;
    userId: string;
    redirectUri: string;
    codeChallenge: string;
    expiresAt: string;
    usedAt?: Nullable<string>;
  }
>;

export const apiTokenSchemas = createCrudSchemas<ApiToken>();
export const oauthClientSchemas = createCrudSchemas<OAuthClient>();
export const oauthCodeSchemas = createCrudSchemas<OAuthCode>();
