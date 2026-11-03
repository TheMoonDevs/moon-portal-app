/*
 * Lets browsers upload chat photos, videos and files straight to the Spaces
 * bucket (signed PUT links from /api/chat/uploads). Run once per bucket:
 *
 *   node --env-file=.env scripts/chat-spaces-cors.mjs https://portal.themoondevs.com
 *
 * Pass every origin the portal runs on (production, previews, localhost).
 * Rules already on the bucket are kept; this adds one for these origins.
 * Needs SPACES_ENDPOINT, SPACES_ACCESS_KEY_ID, SPACES_SECRET_KEY, SPACES_NAME.
 */
import {
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  S3,
} from '@aws-sdk/client-s3';

const origins = process.argv.slice(2);
if (!origins.length) {
  console.error('Usage: node scripts/chat-spaces-cors.mjs <origin> [origin...]');
  process.exit(1);
}

const client = new S3({
  forcePathStyle: false,
  endpoint: process.env.SPACES_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.SPACES_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.SPACES_SECRET_KEY || '',
  },
});
const Bucket = process.env.SPACES_NAME;

let rules = [];
try {
  const current = await client.send(new GetBucketCorsCommand({ Bucket }));
  rules = current.CORSRules ?? [];
} catch {
  // No CORS rules yet.
}

const ID = 'portal-chat-uploads';
rules = rules.filter((rule) => rule.ID !== ID);
rules.push({
  ID,
  AllowedOrigins: origins,
  AllowedMethods: ['PUT', 'GET', 'HEAD'],
  AllowedHeaders: ['*'],
  ExposeHeaders: ['ETag'],
  MaxAgeSeconds: 3600,
});

await client.send(
  new PutBucketCorsCommand({ Bucket, CORSConfiguration: { CORSRules: rules } }),
);
console.log(`CORS rule "${ID}" set on ${Bucket} for: ${origins.join(', ')}`);
