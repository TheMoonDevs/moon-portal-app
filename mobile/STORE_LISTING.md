# Store listing: what to upload to Apple and Google

**Where the stores stand (13 Nov 2026):** both listings are filled from this guide and saved, as **Portal (TMD)**. See [What's left](#whats-left) for the steps that are yours.

Every image and video is in [`portal/public/store-listing/`](../portal/public/store-listing/). After a deploy, the same files are also at `https://portal.themoondevs.com/store-listing/...`.

The screenshots come from the app itself, filled with sample data and made-up people. Upload them in their number order (1 to 8). The first three matter most, because they also show up in search results. The two videos are recorded from the app the same way: real taps, scrolls and typing with the same sample company (see [The videos](#the-videos)).

## At a glance

| Store | Asset | Size (px) | File(s) | Needed? |
| --- | --- | --- | --- | --- |
| Apple | iPhone 6.3" screenshots | 1206 × 2622 | `ios/iphone-6.3/1-8` | **Yes** (uploaded). App Store Connect's iPhone slot takes only 6.1"/6.3" sizes and uses them for every iPhone |
| Apple | iPhone 6.9" and 6.5" screenshots | 1320 × 2868, 1284 × 2778 | `ios/iphone-6.9/1-8`, `ios/iphone-6.5/1-8` | No. Only to give big iPhones their own set (Media Manager) |
| Apple | iPad screenshots | n/a | none | No. The app is iPhone only (`supportsTablet: false`) |
| Apple | App icon | 1024 × 1024 | taken from the build (copy in `ios/app-icon-1024.png`) | Nothing to upload |
| Apple | Product page header | 5244 × 2950 | `ios/creative/header-5244x2950.png` | Optional (uploaded). The top of the product page in iOS 27 |
| Apple | Search results asset | 3840 × 2560 | `ios/creative/search-3840x2560.png` | Optional (uploaded). Shown in search instead of the first screenshots |
| Apple | App preview video | 886 × 1920, 26 s | `ios/app-preview.mp4` | Optional, but it plays first on the listing |
| Google | App icon | 512 × 512 | `android/play-icon-512.png` | **Yes** |
| Google | Feature graphic | 1024 × 500 | `android/feature-graphic.png` | **Yes** |
| Google | Phone screenshots | 1080 × 1920 | `android/phone/1-8` | **Yes**, at least 2 (4 or more to be featured) |
| Google | 7" and 10" tablet screenshots | n/a | none | Optional. Skip them unless you want to be featured on tablets |
| Google | Promo video | YouTube link (1920 × 1080, 30 s) | `android/promo-video.mp4`, uploaded to YouTube | Optional. It plays over the feature graphic |

## Apple App Store (App Store Connect)

### Images

Version 1.0 is out; the next release is version 1.1 (App Store Connect → the app → + next to iOS App → 1.1, matching `version` in `mobile/app.config.ts`). Its screenshots, description and review notes carry over from 1.0; add the iPad screenshots and "What's New in This Version" (the same text works for Play's release notes):

> Portal links in mail or WhatsApp now open in the app. Share text, links and photos from any app into a task, a worklog or a chat. Long-press the app icon for New task, Log work, Chats and Search. Reply to chats and mark tasks done right from notifications, and get a reminder on the day a task is due. One search for tasks, projects, people and chats, @mentions in group chats, and Portal now runs on iPad.

- **iPhone screenshots:** `ios/iphone-6.3/` goes in the "iPhone with Dynamic Island (medium display)" tab, the only iPhone slot App Store Connect now has; it takes 6.1"/6.3" sizes (1206 × 2622) and uses them for every iPhone. They are PNG, have no transparency, and there are 8 of them (Apple allows 1 to 10). Uploaded on 13 Nov 2026, in order.
- **App icon:** comes from the build (`mobile/assets/images/icon.png`, 1024 × 1024, no transparency), so there's nothing to upload. `ios/app-icon-1024.png` is a copy in case you need it.
- **iPad screenshots:** needed from version 1.1, which runs on iPad. `ios/ipad-13/` goes in the "iPad 13-inch" tab (2064 × 2752, PNG, no transparency); App Store Connect uses them for every iPad. They're the same 8 screens and headlines as the iPhone set, on an iPad (Home in two columns).
- **Header and search results** (version page → Header and Search Results; iOS 27 creative assets, uploaded on 13 Nov 2026):
  - **Header:** `ios/creative/header-5244x2950.png`. The top of the product page, behind the back and share buttons, above the app's icon, name and Get button. Apple takes 5244 × 2950 or 3840 × 1646, PNG or video, and crops it per device. So it has no text: the focal point (three phones with the home, Work and project screens) is in the middle and the lower part fades to dark.
  - **Search results:** `ios/creative/search-3840x2560.png`. Shown under the app's name in search, in place of the first screenshots. Apple takes 5244 × 2950, 3840 × 2560 or 1920 × 1280. It has the headline "Your team's work, in your pocket." over the same three phones.
  - Both were checked in App Store Connect's Device Preview (iPhone product page and search results). The iPad preview stayed grey while the app was iPhone only; check it again once 1.1 is uploaded.
  - They're drawn from real app screens by `creative/render.mjs` in the MediaMake project `portal-store-preview`. Rerun it after the screens change.
- **App preview video:** `ios/app-preview.mp4` (886 × 1920, 26 s, 30 fps, H.264 with a silent stereo AAC track; Apple wants an audio track, and previews play muted). It goes in the same iPhone slot, before the screenshots. Uploaded on 13 Nov 2026 as a 6 MB copy of the same video (the browser tool uploads up to 10 MB). After it processes, set the poster frame (the still people see before it plays) to the home screen with its headline, around 0:02. Until then Apple shows the "See what needs you first" frame.

### Text (limits are Apple's)

| Field | Limit | Suggested |
| --- | --- | --- |
| Name | 30 characters | `Portal (TMD)` (12). The plain name `Portal` is taken; `Portal TMD` is the fallback |
| Subtitle | 30 characters | `Tasks, worklogs and team chat` (29) |
| Promotional text | 170 characters, can change without a new version | `Log your work in seconds, see what needs you first, and keep every project, goal and team chat in your pocket.` |
| Description | 4000 characters | See [Description](#description) below |
| Keywords | 100 bytes, comma separated, no spaces after commas | `timesheet,todo,projects,goals,standup,planner,productivity,okr,workspace,daily log,office,hr` (92). Words already in the name or subtitle are left out, since Apple searches those anyway |
| What's New | 4000 characters | `First release.` |
| Primary / secondary category | | Business / Productivity |
| Copyright | | `2026 The Moon Devs` |

### URLs

| Field | Needed? | Value |
| --- | --- | --- |
| Privacy Policy URL | **Yes** | `https://portal.themoondevs.com/privacy` |
| Support URL | **Yes** | `https://portal.themoondevs.com/support` |
| Marketing URL | Optional | The company website |
| License agreement | Optional | Apple's standard EULA, or `https://portal.themoondevs.com/terms` |

### Other forms in App Store Connect

- **App Privacy:** the app has no tracking, no ads and no analytics. Privacy Policy URL `https://portal.themoondevs.com/privacy`. "Yes, we collect data", with six data types, each **used for App Functionality only, linked to the user's identity, not used for tracking**:
  - Contact Info: Name, Email Address
  - User Content: Emails or Text Messages (chat), Photos or Videos (profile photo, photos sent in chat), Other User Content (tasks, worklogs, files)
  - Identifiers: User ID

  This matches the privacy page. All set on 13 Nov 2026; **Publish** is yours.
- **Age rating** (set on 13 Nov 2026): Features: no parental controls, no age assurance, no unrestricted web access, **yes user-generated content**, no social media, **yes messaging and chat**, no advertising. Every content question (mature themes, medical, sexuality, violence, chance-based) is None or No. Apple calculates 4+; it's **overridden to 18+**, to match Play's 18+ target audience.
- **Export compliance:** already answered in the build (`ITSAppUsesNonExemptEncryption: false`).
- **Sign in with Apple:** already in the app, which Apple requires because Google sign-in is offered.
- **Account deletion:** already in the app (Settings → Delete my account), which Apple requires.
- **App Review information:** sign-in is required, so use the test sign-in (see [Reviewer sign-in](#reviewer-sign-in)). Put the reviewer email and password in the sign-in fields, and the notes from [App Store review notes](#app-store-review-notes).
- **Chat safety (guideline 1.2):** chat is user-generated content, so the app has what Apple asks for. Long-press someone's message for **Report** (pick a reason; it's hidden for you at once, and you can block the sender too) and **Block**. A direct chat's ⋯ menu and a person's page also block, and Settings → Privacy and alerts → **Blocked people** unblocks. Reports reach Portal's admins as a notification and a push, and wait in the website's Admin → **Chat reports**, where each is removed for everyone or left up. Answer them within a day.

## Google Play (Play Console)

### Images

| Asset | Spec (Google's) | File |
| --- | --- | --- |
| App icon | 512 × 512, 32-bit PNG with transparency, up to 1 MB | `android/play-icon-512.png` (38 KB). Play rounds the corners itself |
| Feature graphic | 1024 × 500, JPEG or 24-bit PNG, no transparency | `android/feature-graphic.png` |
| Phone screenshots | 2 to 8, JPEG or 24-bit PNG, no transparency, each side 320 to 3840 px, long side at most 2× the short side. To be featured: at least 4, portrait 9:16, 1080 × 1920 or larger | `android/phone/1-8` (1080 × 1920) |
| Tablet screenshots (7", 10") | Optional, 1080 to 7680 px, 9:16 or 16:9 | none |
| Video | Optional: a public or unlisted YouTube link, ads off, embeddable | `https://www.youtube.com/watch?v=YupCJ_Jqbew`: `android/promo-video.mp4`, Unlisted on the TheMoonDevs channel ("Portal (TMD): your team's work, in your pocket"; the channel isn't monetised, so no ads) |

### Text (limits are Google's)

| Field | Limit | Suggested |
| --- | --- | --- |
| App name | 30 characters | `Portal (TMD)`, the same as on the App Store |
| Short description | 80 characters | `Your team's tasks, worklogs, projects, goals and chat, in one app.` (66) |
| Full description | 4000 characters | See [Description](#description) below |
| Category | | Business (or Productivity) |
| Contact email, website | | `support@themoondevs.com`, `https://portal.themoondevs.com/support` |
| Privacy policy | Required | `https://portal.themoondevs.com/privacy` |

### Other Play Console forms (under "App content")

- **Sign-in details** (once called App access): answer "Yes, parts are restricted" and add the test sign-in (see [Reviewer sign-in](#reviewer-sign-in)).
- **Ads:** no ads.
- **Content rating:** fill in the questionnaire. Say yes to people being able to message each other.
- **Target audience:** 18 and over (a work app).
- **Data safety:**
  - Data collected: name, email, user ID, messages and other content people write, and files they choose to send. It's used for app functionality, not shared, and encrypted in transit.
  - People can ask for their data to be deleted. The account deletion URL is `https://portal.themoondevs.com/delete-account`.
- **Testing before production:** a personal developer account made after Nov 2023 needs a closed test with 12 testers for 14 days before it can go to production. An organization account doesn't.

## What's left

Filled and saved on 13 Nov 2026 (with Claude in Chrome, from this guide):

- **Play:** the default store listing: name, short and full description, icon, feature graphic, 8 phone screenshots in order, and the promo video link. App content (privacy policy, app access, ads, content rating, target audience, data safety and the rest) was already done.
- **App Store:**
  - version 1.0: promotional text, description, keywords, Support URL, copyright, the header and search results assets, 8 screenshots, the preview and the review notes
  - App Information: name, subtitle, Business / Productivity, the age rating with the 18+ override
  - App Privacy: the privacy URL and all six data types

Yours:

- **App Store Connect:**
  - Publish App Privacy.
  - Set Content Rights (App Information).
  - Enter the reviewer email and password, and your review contact (name, phone, email).
  - Add a build from TestFlight (`eas submit`). Version 1.0 was rejected under 2.1 (Information Needed, 14 Nov 2026): it needs a build with report and block (1.1.0 build 7 or later), a screen recording from a real iPhone, and the [App Store review notes](#app-store-review-notes).
  - Choose manual or automatic release (it's on automatic after approval).
  - Set the preview's poster frame.
  - Add for Review.
- **Play:** if not done yet, the listing's AI asset declaration, then Send for review in Publishing overview, then the release.

## Reviewer sign-in

Reviewers can't use our Google accounts, so the app has a test sign-in. They type the code `TEST12`, and the app asks for an email and password instead of Google. Only one Portal account can sign in this way, and the portal checks the password (`portal/lib/mobile/testSignIn.ts`).

Set it up once:

1. Create the reviewer and their demo company with the seed script. From `portal/`, with `DATABASE_URL` in `portal/.env` pointing at the production database:

   ```sh
   npx -y tsx --tsconfig tsconfig.json scripts/seed-review-account.ts <reviewer email>           # shows what it will do
   npx -y tsx --tsconfig tsconfig.json scripts/seed-review-account.ts <reviewer email> --apply  # does it
   ```

   It makes the reviewer, three made-up teammates (`@demo.example.com`, they can't sign in) and the company **Brightside Studio**, with the reviewer as its owner but not a Portal admin. It adds a week of sample work: 3 projects, a target goal and a weekly goal, tasks and worklogs (some waiting on the reviewer), a plan, a page, a group chat and a direct chat. It sends no email and is safe to run again: what's there is left as it is. It never sets a password.
2. In Vercel, under the portal project's environment variables, add `MOBILE_TEST_EMAIL` (that email) and `MOBILE_TEST_PASSWORD` (a long random password). Remove either one to turn the test sign-in off.
3. Use a build that has the test sign-in for review. Builds made before it get it after an `eas update` and a restart.

What to enter in the store forms:

| Field | Value |
| --- | --- |
| Name (Play) | `Reviewer test account` |
| Username / email | The reviewer email |
| Password | The reviewer password |
| Other information / review notes | The text below (400 characters, Play allows 500) |

```
Portal is a work app for company members. To sign in:
1. Open the app.
2. In "Your sign-in code", type TEST12.
3. Email and Password fields appear. Enter the email and password above.
4. Tap Sign in. Don't use "Continue with Google".
The account belongs to a demo company with sample projects, tasks, goals and chats, so every screen can be reviewed. No 2-step verification or other steps are needed.
```

The portal allows 5 wrong passwords per address (30 in all) every 15 minutes, then asks to wait.

### App Store review notes

After the 2.1 rejection, Apple asks for all of this in the review notes (up to 4000 characters):

1. **A screen recording from a physical iPhone** on the latest iOS, with the build under review from TestFlight. Start recording on the home screen (Control Center → Screen Recording) so the launch is in it, then show:
   - signing in with `TEST12`, then the reviewer email and password;
   - Today → open a task → change its status → log work → Projects → a project → a chat, sending a message;
   - long-press a teammate's message → **Report** → a reason → Report; then **Block** someone and unblock them in Settings → Blocked people;
   - Settings → **Delete my account** up to its confirmation, then Cancel (so the reviewer's account isn't queued for deletion).

   Upload it to TheMoonDevs' YouTube as Unlisted and put the link first in the notes (or attach the file under Attachment).
2. Then this text, below the link:

```
Video of the app on an iPhone: <link>

Purpose and audience: Portal is a work app for companies and their teams. Members see what needs them first, update tasks, log the work they did each day, follow projects and goals, and chat with their team, instead of spreading this across chat apps, sheets and email. It's for adults (18+) who work for a company set up in Portal. It isn't one company's internal tool: several companies use it; a company is set up once our team approves it, and its admins invite their people.

Signing in: there is no public sign-up; a company's admins add its members. Open the app, type the code TEST12, then the email and password in Sign-In Information, and tap Sign in. The account belongs to a sample company with projects, tasks, goals and chats.

Main features: Today (what needs you, meetings), Work (tasks: tap one to change its status or log work), Projects (each project's team, goals and work logs), Chats (project chats, groups and direct messages), Settings.

Chat safety: long-press someone's message to Report it (with a reason; it's hidden for you at once) or Block its sender. A direct chat's ⋯ menu and a person's page also block; Settings → Blocked people unblocks. Blocked people's messages are hidden in every chat and they can't message you. Reports go to our admins, who remove the message or leave it within 24 hours, and can deactivate anyone who posts abuse.

Account deletion: Settings → Delete my account. The company's admins delete the account and its sign-in; work done for a company stays with that company.

External services: Portal's own server (on Vercel), MongoDB (database), Amazon S3 (files and photos), Ably (live chat), Google Sign-In and Sign in with Apple, Apple Push Notification service through Expo (notifications), Sentry (crash reports). No in-app purchases and no ads.

Regions: the app works the same in every region, in English.

Regulated industries: Portal isn't in a regulated industry and has no protected third-party material.
```

## Description

Use the same text for both stores (about 930 characters):

```
Portal is where your team's work lives. Log what you did, see what needs you, and keep projects, goals and chat moving, right from your phone.

YOUR DAY
• Today's tasks, meetings and updates the moment you open the app
• "Needs you" puts waiting and blocked tasks at the top
• Log work in seconds, with a status for every task: To do, Doing, Pause, Wait, Blocked or Done

PROJECTS AND GOALS
• Every project has its own page: its brand, team, progress, goals, pages and worklogs
• Weekly and target goals fill up as work gets done
• Plans turn ideas into steps, tasks and goals

YOUR TEAM
• Chat one to one, in groups, or in a project's own chat
• Replies, reactions and push notifications
• See who did what on the leaderboard

MADE FOR YOUR PHONE
• Works offline and catches up when you're back online
• Face ID lock, Sign in with Apple and Google
• Dark and light themes

You need a Portal account from your company to sign in.
```

## The screenshots

| # | Headline | Shows |
| --- | --- | --- |
| 1 | Your whole workday, in one app | Home: greeting, today's date, meetings, companies |
| 2 | See what needs you first | Work tab: Needs you, work updates, today's tasks |
| 3 | Update a task in one tap | A task: status dots and Log work |
| 4 | Every project at a glance | Projects list with progress rings |
| 5 | Each project, like a channel | A project page: banner, logo, brand colours, goals |
| 6 | Chat with your team | A chat with replies and reactions |
| 7 | Everything one tap away | Shortcuts with quick links |
| 8 | Climb the leaderboard | Leaderboard |

When the app's screens change, ask in this thread and I'll make them again.

## The videos

Both videos use the same cut of four takes recorded from the app's web build on an iPhone-sized screen, signed in to the sample company, with nothing sent to the real portal. The status bar, home indicator and the iOS push and sheet animations are drawn in the edit. The headlines match the screenshots.

| Time | Headline | Shows |
| --- | --- | --- |
| 0:00 | Your whole workday, in one app | Home: scroll down the day and back |
| 0:03 | See what needs you first | The Work tab: Needs you, today's tasks |
| 0:05 | Update a task in one tap | A task set to Done, then Log work with a typed note, and its history |
| 0:11 | Every project at a glance | The projects list |
| 0:14 | Each project, like a channel | A project page: banner, brand colours, goals, team |
| 0:17 | Chat with your team | A reaction, a message sent, a teammate's reply |
| 0:23 | Portal: Your team's work, in your pocket. | The end card |

- **App Store preview** (`ios/app-preview.mp4`): the screenshots' cream look, 26 s.
- **Play promo** (`android/promo-video.mp4`): the feature graphic's dark look, played closer to real time, 30 s. It ends with "Now on Google Play".
- Both have a silent track. To add music, put it under the video in any editor, or ask for it to be added to the MediaMake projects.
- They are the MediaMake projects `portal-store-preview` and `portal-store-promo` (the cut is in `portal-store-preview/lib/plan.ts`), made with the `pack-store-listing` skill (MediaMake). After the app changes, that skill records new takes and renders both again.
