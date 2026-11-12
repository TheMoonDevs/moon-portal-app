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
| Privacy Policy URL | **Yes** | `https://portal.themoondevs.com/privacy` (live once PR #447 is merged) |
| Support URL | **Yes** | A page where people can reach you, such as the company website's contact page |
| Marketing URL | Optional | The company website |

### Other forms in App Store Connect

- **App Privacy:** the app has no tracking, no ads and no analytics. The data it handles, all linked to the person and used only for app functionality, is:
  - name, email address and photo
  - user ID
  - messages, and the tasks and worklogs people write
  - files they choose to send
  
  This should match the privacy page from PR #447.
- **Age rating:** answer the questionnaire. The app has chat between people, so say yes to messaging and user-generated content.
- **Export compliance:** already answered in the build (`ITSAppUsesNonExemptEncryption: false`).
- **Sign in with Apple:** already in the app, which Apple requires because Google sign-in is offered.
- **Account deletion:** already in the app (Settings → Delete my account), which Apple requires.
- **App Review information:** the app needs a sign-in, so Apple asks for a demo account that never expires. The app only offers Google and Apple sign-in, so here are two options:
  1. Make a Google account for reviewers, add it to a demo company in the Portal with sample data, and give its email and password in the review notes. Turn off 2-step verification for it. Google may still ask the reviewer to verify, which could get the app rejected.
  2. Add a reviewer sign-in (email and a one-time code) to the app. This always works for reviewers, but it needs a small code change and a new build.

  Google Play asks for the same thing under **App access**.

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

- **App access:** sign-in is required, so give reviewers a login. This is the same demo account as for Apple.
- **Ads:** no ads.
- **Content rating:** fill in the questionnaire. Say yes to people being able to message each other.
- **Target audience:** 18 and over (a work app).
- **Data safety:**
  - Data collected: name, email, user ID, messages and other content people write, and files they choose to send. It's used for app functionality, not shared, and encrypted in transit.
  - People can ask for their data to be deleted. The account deletion URL is `https://portal.themoondevs.com/delete-account` (live once PR #447 is merged).
- **Testing before production:** a personal developer account made after Nov 2023 needs a closed test with 12 testers for 14 days before it can go to production. An organization account doesn't.

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
