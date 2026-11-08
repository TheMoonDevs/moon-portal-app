/**
 * Daily sanity check (2026-11-08).
 *
 * Verifies that the env vars the portal needs to boot are documented in
 * .env.example and that key project files exist. Exits 0 when everything is
 * in place, 1 otherwise. Reads files only; needs no env values or network.
 *
 * Run from the repo root or from portal/:
 *   npx tsx portal/scripts/checks/daily-check-2026-11-08.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REQUIRED_ENV_VARS = [
  'NEXTAUTH_SECRET',
  'DATABASE_URL',
  'NEXT_PUBLIC_APP_BASE_URL',
  'RESEND_API_KEY',
  'RESEND_DOMAIN',
];

const KEY_FILES = [
  'package.json',
  'tsconfig.json',
  'next.config.mjs',
  'middleware.ts',
  '.env.example',
];

const cwd = process.cwd();
const portalRoot = existsSync(join(cwd, 'portal', 'package.json'))
  ? join(cwd, 'portal')
  : cwd;

const failures: string[] = [];

for (const file of KEY_FILES) {
  if (!existsSync(join(portalRoot, file))) {
    failures.push(`missing file: ${file}`);
  }
}

const envExamplePath = join(portalRoot, '.env.example');
if (existsSync(envExamplePath)) {
  const documented = new Set(
    readFileSync(envExamplePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split('=')[0].trim()),
  );
  for (const name of REQUIRED_ENV_VARS) {
    if (!documented.has(name)) {
      failures.push(`env var not documented in .env.example: ${name}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Daily check failed (${failures.length}):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `Daily check passed: ${KEY_FILES.length} key files present, ${REQUIRED_ENV_VARS.length} env vars documented.`,
);
process.exit(0);
