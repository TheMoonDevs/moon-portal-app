# Portal Cleanup

Branch: `refactor/portal-cleanup`

Reduced the portal to six features — **Home dashboard, Admin, Login/Logout, Worklogs, Worksheets, URL Shortener** — plus **Studio / `app/ai`**. Everything else was removed. Surviving features are unchanged in behavior and UI; the auth layer was rewritten to fix a session bug.

**Net: 341 files changed, ~43,200 lines removed.** Page routes 54 → 18, API routes 98 → 45, screen modules 26 → 8, dependencies 130 → 123. `next build` and `tsc --noEmit` both pass.

---

## Removed features

Each was verified to be imported only by its own route before deletion.

| Feature | Routes removed | Reason |
|---|---|---|
| Quicklinks | `/quicklinks/*` (11 pages), `/api/quicklinks/*` | Not in keep list |
| Studio was **kept**; the following AI-adjacent features were not | | |
| Custom Bots | `/custom-bots/*`, `/api/custom-bots/*` | Not in keep list |
| HR Screening | `/hr/screening/*`, `/api/candidate`, `/api/jobPost` | Not in keep list |
| Workflow demos | `/workflows/*`, `/api/workflows/*` | Demo scaffolding |
| Houses | `/houses` | Nav entry was already commented out |
| Teams | `/teams` | Stub, nav commented out |
| Zero-Tracker | `/user/zero-tracker`, `/api/user/zeros` | Not in keep list |
| Email Tracker | `/email-tracker`, `/api/email-tracker` | No inbound link |
| Missions | `/admin/missions`, `/api/missions`, `/api/mission-tasks` | Not in Admin menu |
| Invoice Generator | `/admin/invoice-generator`, `/api/invoice` | Not in Admin menu |
| Dev Profile | `/dev-profile`, `/api/dev-profile` | Not in keep list |
| File Uploads (page) | `/file-uploads` | Not in keep list (avatar upload kept, see below) |
| Google Calendar | `/google-calendar` | Not in keep list |
| Member Onboarding | `/member/onboarding/*`, `/api/onboarding` | Coinbase wallet flow, no link |
| Medium articles sync | `/api/articles`, `/api/cron-jobs/sync/medium-articles` | Feature removed |
| Misc APIs | `/api/subscribe`, `/api/survey`, `/api/client-survey` | Belonged to removed features |
| Stray file | `pages/edit-jobpost` | Orphaned Pages-Router file |

Support code removed alongside the above: their Redux slices (`quicklinks`, `zerotracker`, `missions`, `onboarding`, `searchTerm`), services (`QuicklinksSdk`, `MediumBlogsSdk`, `githubSdk`, `googleSheetSdk`, `customBots`), hooks (`useQuicklinksPopover`, `useClipboardUrlDetection`, `useCountryInfo`, `useWorkflowJob`), constants, and `components/ai` was **kept** (Studio depends on it).

### CLIENT user type removed

The `USERTYPE.CLIENT` code paths were removed (the enum value stays for existing DB records):

- `ClientHomePage` deleted from `HomePage.tsx` — Home now has one code path (member).
- Client nav branch removed from `Bottombar`.
- Client button removed from the login screen.
- Admin tabs **Engagements**, **Invoices**, **Client Shortcuts** removed, plus their APIs (`/api/engagement`, `/api/client-invoice`, `/api/client-shortcuts`, `/api/clients`).
- Client-facing `/engagements` and `/invoices` pages removed.

---

## Kept despite belonging to a removed area

- **`fileUpload` Redux slice** — the File Uploads page is gone, but Home's profile drawer uses this slice for avatar/banner upload.
- **`/api/events` + Admin Event Form** — this is the Home dashboard Events widget, separate from Zero-Tracker.
- **Cron jobs** (`/api/cron-jobs/*`, `cron/`, `worker/index.js`) — live infrastructure driven by `vercel.json` and PM2, not referenced from the frontend. `worklog-summary-reminder` posts the daily Worklogs digest to Slack. Only the Medium-articles cron was dropped.
- **`worker/index.js`** — the push-notification service worker loaded by `next-pwa`.

---

## Auth rewrite (the one behavior change, requested)

**Bug:** `useUser` returned `status: 'authenticated'` whenever a user record existed in `localStorage`, which never expires. After a first login the app treated every session as valid forever, so guarded pages stayed reachable after the session died.

**Fixes:**

- **`useUser`** — NextAuth session is now the single source of truth. `localStorage`/Redux are a profile cache only, used only when the cached id matches the session id. Never fakes `authenticated`.
- **`middleware.ts`** — previously CORS + API-key only, no route protection. Now verifies the NextAuth JWT and redirects unauthenticated page requests to `/login` before any HTML is served. Cookie name derived from request protocol (works behind proxies / preview domains). CORS and API-key logic split into `middlewares/cors.ts` and `middlewares/apiKey.ts`.
- **`PageAccess`** — simplified; layout padding is now an explicit `hasBottombar` prop instead of a runtime `document.getElementById` DOM query.
- **Deleted `RedirectWrapperProvider`** — existed only to work around an infinite dispatch loop caused by the session/Redux/localStorage split, which no longer exists.
- **Deleted `AppLayout`** — called `useUser` for side effects and rendered a bare `<div>`.
- **Logout** now clears per-user `localStorage` caches (`notifications`, `passcode`) — previously leaked to the next user on a shared browser.

---

## Other necessary changes

- **`APP_ROUTES`** trimmed to routes that still exist (removed `growth`, `referrals`, `dashboard`, `analytics`, `docs`, `signup`, and removed-feature routes).
- **Home `ActionsSection`** — removed links to deleted features and the 3 dead "coming soon" placeholders; kept Worklogs, URL Shortener, Slack, ClickUp.
- **Worklogs** — removed the Engagement picker (its only data source, the Admin Engagements tab, was removed with client support). Guarded by `engagements.length > 0`, so no visual change.
- **Model layer** — split into `badges.ts`, `notifications.ts`, `platform.ts`, `users.ts`, `worklogs.ts` (type-only), and the Mongo registry / validation map trimmed to the 15 collections still used.
- **Removed dependencies:** `@hookform/resolvers`, `@mui/x-data-grid`, `cn`, `react-phone-number-input`, `react-select`, `react-table`, `remark-html`, `@types/react-table`, `@types/react-select-country-list`, `@types/jsdom`.

---

## Not done (out of scope)

Surviving features were left as-is by request. No code-quality refactoring was done on their internals — existing `console.log`s, `any` types, commented-out blocks, and large components in Worklogs / Worksheets / Studio remain untouched.

## Follow-ups for you

- Run `npm install` to sync the lockfile after the dependency removals.
- `NEXT_PUBLIC_TMD_PORTAL_API_KEY` gates mutating API routes but ships in the browser bundle (it's public) — pre-existing, not addressed here.
- `/images/avatar.png` is referenced as a fallback but doesn't exist in `public/` — pre-existing.
- Crons `pay-reminder`, `wallet-notification`, `birthday-reminder` were kept but aren't tied to the six kept features; `pay-reminder` pairs with the `/api/slack/webhook` confirm-payment handler. Remove together if unwanted.
