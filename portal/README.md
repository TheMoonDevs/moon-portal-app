# Portal

Worklogs, projects, plans, hiring, onboarding and messages for every company
on the portal. A Next.js 14 app (App Router) in TypeScript.

## Architecture

| Service | What it does for the portal | Where it's used | Settings |
|---|---|---|---|
| **Next.js on Vercel** | Pages and API routes (`app/api`) run as serverless functions. Vercel Cron runs the daily jobs in `vercel.json`. | `app/`, `vercel.json` | `NEXT_PUBLIC_APP_BASE_URL`, `CRON_SECRET` |
| **MongoDB** | The database for everything: users, companies, projects, tasks, worklogs, hiring, chats. Reached through a small Prisma-style client over the MongoDB driver. | `lib/db`, `lib/mongodb`, `models/` | `DATABASE_URL`, `DATABASE_URL_FALLBACK` |
| **NextAuth + Firebase Auth** | Sign-in. Firebase does the Google sign-in in the browser; NextAuth keeps the session (JWT cookie) that pages and API routes check. Firebase Analytics logs usage events. | `lib/auth`, `middleware.ts`, `utils/services/firebase.ts` | `NEXTAUTH_SECRET`, `NEXTAUTH_URL` |
| **DigitalOcean Spaces** (S3 API) | File storage: avatars, uploads, brand kits, hiring and onboarding files, chat photos, videos and files. Private files are only shown through short-lived signed links. | `utils/services/s3FileUploadSdk.tsx`, `lib/hiring`, `lib/chat/storage.ts` | `SPACES_ENDPOINT`, `SPACES_NAME`, `SPACES_ACCESS_KEY_ID`, `SPACES_SECRET_KEY` |
| **Ably** | Live updates for Messages: new messages, delivered and read ticks, typing and online status. Browsers get short-lived tokens from `/api/chat/realtime-token`; the server publishes after each change. | `lib/chat/realtime.ts`, `components/screens/Messages/ChatProvider.tsx` | `ABLY_API_KEY` (server only) |
| **Web Push + service worker** | Push notifications (reminders, alerts, new messages), the app badge, offline page. VAPID keys sign the pushes; Serwist builds the service worker from `app/sw.ts`. Every push also goes to signed-in phones through Expo's push service (`lib/push/expo.ts`). | `lib/push`, `app/sw.ts` | `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_EMAIL`, `EXPO_ACCESS_TOKEN` (optional) |
| **Resend** | Email: hiring emails and digests, meeting invites. A webhook reports delivered, opened and bounced. | `lib/hiring`, `lib/meet/emails.ts` | `RESEND_API_KEY`, `RESEND_DOMAIN`, `RESEND_WEBHOOK_SECRET` |
| **Google Gemini** | AI help: matching logged work to tasks and goals. | `lib/worklogs/linker.ts`, `lib/workspace/goalFit.ts`, `utils/services/GenAiSdk.ts` | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| **MCP server + OAuth** | Lets AI assistants (Claude) read and log work in the portal for a signed-in person. | `app/api/mcp`, `app/api/oauth`, `lib/mcp` | |
| **Mobile app API** | The Expo app in `/mobile` signs in with a sign-in code + Google (or a linked Apple ID) like the website and gets a `pmob_` token (one per phone, listed with the connections in Settings). Every API route accepts it through `getSessionUser()`. The app's own routes: Apple sign-in and linking, a task with its history, asking for account deletion (tells the admins), and the minimum and latest app versions. Portal links open in the app through `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`. | `app/api/mobile`, `lib/mobile`, `app/.well-known`, `lib/auth/signIn.ts`, `lib/auth/appleIdToken.ts` | `APPLE_BUNDLE_IDS` (optional), `MOBILE_MIN_VERSION`, `MOBILE_LATEST_VERSION` (or `_IOS` / `_ANDROID`), `MOBILE_APP_STORE_URL`, `MOBILE_PLAY_STORE_URL` (optional), `APPLE_TEAM_ID`, `ANDROID_CERT_SHA256` (app links) |

Production and CI settings live in dotenv-vault (see the root README).

### Daily jobs (`vercel.json`)

| Job | When (UTC) | What it does |
|---|---|---|
| `/api/cron/schedules` | 01:00 | Makes the day's tasks for repeating goals. |
| `/api/cron/day-reminders` | 03:00 and 17:00 | Morning and evening worklog reminders. |
| `/api/cron/hiring-digest` | 02:30 | Hiring digest emails to hiring leads. |
| `/api/cron/chat-media` | 04:00 | Removes chat photos, videos and files older than 90 days. |

### Messages

One-to-one chats between people who share an active company; with no company
in common they can't see or message each other. MongoDB holds the messages
(`ChatConversation`, `ChatMessage`, `ChatPresence`); Ably only carries "something
changed" events, so nothing is lost when a connection drops, and without
`ABLY_API_KEY` the screens fall back to asking the server every few seconds.

- **Ticks:** one grey when saved, two grey when the other person's browser or
  service worker received it, two blue when they opened the chat.
- **Files:** browsers upload straight to Spaces with signed links (photos are
  resized and get a preview in the browser, videos get a first-frame poster),
  up to 100 MB. The bucket needs a CORS rule once:
  `node --env-file=.env scripts/chat-spaces-cors.mjs <portal origin>`.
- **Notifications:** a push for each new message unless the chat is muted,
  skipped while the portal is open in front, with a Mark as read button.

To do later: group chats, voice notes, link previews, calls; and moving
realtime from Ably to our own server on DigitalOcean once usage outgrows
Ably's plan.

## Getting Started

First, run the development server:

```bash
npm run dev 
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Setup

Required  `node v18.x.x`

1. `npm i`
2. `npm run dev`

## DB Schema DX Workflow

The DB contract is now split so schema/type changes are easy to find:

- `models/<domain>.ts`: model types + Zod CRUD schemas (`entity`, `create`, `update`)
- `lib/mongodb/registry.ts`: Mongo model registry (`collection`, `idField`, `objectIdFields`, `relations`)
- `types/db-client/index.ts`: public barrel used by `@db/client`
- `lib/mongodb/validation.ts`: write-path helpers (`parseCreateInput`, `parseUpdateInput`)

### Add a new model

1. Add the model type and `createCrudSchemas<YourModel>()` in the relevant `models/<domain>.ts` file.
2. Register the model in `lib/mongodb/registry.ts`.
3. Re-export from `types/db-client/index.ts` (usually automatic through `models/index.ts` exports).
4. Use `parseCreateInput` / `parseUpdateInput` in write routes before calling `db.<model>.create/update`.

### Change an existing model

1. Update the model shape in `models/<domain>.ts`.
2. If Mongo relation/object-id behavior changed, update `lib/mongodb/registry.ts`.
3. Update any route/service write parsing through `lib/mongodb/validation.ts`.
4. Run `npm run check-types` and `npm run lint`.

# Tools, Deps & Links

- PWA / service worker: Serwist <https://serwist.pages.dev/docs/next> (source in `app/sw.ts`)
- Next.js PWA guide <https://nextjs.org/docs/app/guides/progressive-web-apps>
- Manifest Generator <https://www.simicart.com/manifest-generator.html/>
- Push payload <https://github.com/mdn/serviceworker-cookbook/tree/master/push-payload>
- Offline <https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/js13kGames/Offline_Service_workers>
- PWA Notifications <https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/js13kGames/Re-engageable_Notifications_Push>
