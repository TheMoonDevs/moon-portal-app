# Store listing: what to upload to Apple and Google

Every image is in [`portal/public/store-listing/`](../portal/public/store-listing/). After a deploy, the same files are also at `https://portal.themoondevs.com/store-listing/...`.

The screenshots come from the app itself, filled with sample data and made-up people. Upload them in their number order (1 to 8). The first three matter most, because they also show up in search results.

## At a glance

| Store | Asset | Size (px) | File(s) | Needed? |
| --- | --- | --- | --- | --- |
| Apple | iPhone 6.9" screenshots | 1320 × 2868 | `ios/iphone-6.9/1-8` | **Yes**. Apple scales these down for smaller iPhones |
| Apple | iPhone 6.5" screenshots | 1284 × 2778 | `ios/iphone-6.5/1-8` | Only if App Store Connect asks for this size |
| Apple | iPhone 6.3" screenshots | 1206 × 2622 | `ios/iphone-6.3/1-8` | Only if App Store Connect asks for this size |
| Apple | iPad screenshots | n/a | none | No. The app is iPhone only (`supportsTablet: false`) |
| Apple | App icon | 1024 × 1024 | taken from the build (copy in `ios/app-icon-1024.png`) | Nothing to upload |
| Apple | App preview video | 886 × 1920, 15 to 30 s | none | Optional |
| Google | App icon | 512 × 512 | `android/play-icon-512.png` | **Yes** |
| Google | Feature graphic | 1024 × 500 | `android/feature-graphic.png` | **Yes** |
| Google | Phone screenshots | 1080 × 1920 | `android/phone/1-8` | **Yes**, at least 2 (4 or more to be featured) |
| Google | 7" and 10" tablet screenshots | n/a | none | Optional. Skip them unless you want to be featured on tablets |
| Google | Promo video | YouTube link | none | Optional |

## Apple App Store (App Store Connect)

### Images

- **iPhone screenshots:** upload `ios/iphone-6.9/` under the 6.9" iPhone display. They are PNG, have no transparency, and there are 8 of them (Apple allows 1 to 10 per size). Apple uses this set for every smaller iPhone too. If App Store Connect still asks for the 6.5" or 6.3" size, upload the matching folder.
- **App icon:** comes from the build (`mobile/assets/images/icon.png`, 1024 × 1024, no transparency), so there's nothing to upload. `ios/app-icon-1024.png` is a copy in case you need it.
- **iPad:** not needed, because the app doesn't run on iPad.
- **App preview video (optional):** 15 to 30 seconds, 886 × 1920 portrait, H.264 or ProRes 422 HQ. I didn't make one.

### Text (limits are Apple's)

| Field | Limit | Suggested |
| --- | --- | --- |
| Name | 30 characters | `Portal by TheMoonDevs` (21). Use the plain name `Portal` if it's free |
| Subtitle | 30 characters | `Tasks, worklogs and team chat` (29) |
| Promotional text | 170 characters, can change without a new version | `Log your work in seconds, see what needs you first, and keep every project, goal and team chat in your pocket.` |
| Description | 4000 characters | See [Description](#description) below |
| Keywords | 100 bytes, comma separated, no spaces after commas | `timesheet,todo,projects,goals,standup,planner,productivity,okr,workspace,daily log,office,hr` (92). Words already in the name or subtitle are left out, since Apple searches those anyway |
| What's New | 4000 characters | `First release.` |
| Primary / secondary category | | Business / Productivity |
| Copyright | | `2026 TheMoonDevs` (use the legal name on your account) |

### URLs

| Field | Needed? | Value |
| --- | --- | --- |
| Privacy Policy URL | **Yes** | `https://portal.themoondevs.com/privacy` |
| Support URL | **Yes** | A page where people can reach you, such as the company website's contact page |
| Marketing URL | Optional | The company website |
| License agreement | Optional | Apple's standard EULA, or `https://portal.themoondevs.com/terms` |

### Other forms in App Store Connect

- **App Privacy:** the app has no tracking, no ads and no analytics. The data it handles, all linked to the person and used only for app functionality, is:
  - name, email address and photo
  - user ID
  - messages, and the tasks and worklogs people write
  - files they choose to send
  
  This should match the privacy page at `https://portal.themoondevs.com/privacy`.
- **Age rating:** answer the questionnaire. The app has chat between people, so say yes to messaging and user-generated content.
- **Export compliance:** already answered in the build (`ITSAppUsesNonExemptEncryption: false`).
- **Sign in with Apple:** already in the app, which Apple requires because Google sign-in is offered.
- **Account deletion:** already in the app (Settings → Delete my account), which Apple requires.
- **App Review information:** sign-in is required, so use the test sign-in (see [Reviewer sign-in](#reviewer-sign-in)). Put the reviewer email and password in the sign-in fields, and the steps in the notes.

## Google Play (Play Console)

### Images

| Asset | Spec (Google's) | File |
| --- | --- | --- |
| App icon | 512 × 512, 32-bit PNG with transparency, up to 1 MB | `android/play-icon-512.png` (38 KB). Play rounds the corners itself |
| Feature graphic | 1024 × 500, JPEG or 24-bit PNG, no transparency | `android/feature-graphic.png` |
| Phone screenshots | 2 to 8, JPEG or 24-bit PNG, no transparency, each side 320 to 3840 px, long side at most 2× the short side. To be featured: at least 4, portrait 9:16, 1080 × 1920 or larger | `android/phone/1-8` (1080 × 1920) |
| Tablet screenshots (7", 10") | Optional, 1080 to 7680 px, 9:16 or 16:9 | none |
| Video | Optional: a public or unlisted YouTube link, ads off, embeddable | none |

### Text (limits are Google's)

| Field | Limit | Suggested |
| --- | --- | --- |
| App name | 30 characters | `Portal by TheMoonDevs` |
| Short description | 80 characters | `Your team's tasks, worklogs, projects, goals and chat, in one app.` (66) |
| Full description | 4000 characters | See [Description](#description) below |
| Category | | Business (or Productivity) |
| Contact email, website | | Your support email and website |
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

## Reviewer sign-in

Reviewers can't use our Google accounts, so the app has a test sign-in. They type the code `TEST12`, and the app asks for an email and password instead of Google. Only one Portal account can sign in this way, and the portal checks the password (`portal/lib/mobile/testSignIn.ts`).

Set it up once:

1. In the Portal, create a user for reviewers, such as `review@themoondevs.com` (no real mailbox needed). Add them to a demo company with sample projects, tasks, goals and chats. Don't make them an admin.
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
