/**
 * Pure (framework-agnostic) permission primitives, safe to import from both
 * server route handlers and client components.
 *
 * Server-only helpers (session resolution, request guards) live in
 * `./server` and must NOT be re-exported here to keep this module
 * client-safe.
 */
export * from './catalog';
export * from './defaults';
export * from './matching';
export * from './PermissionError';
