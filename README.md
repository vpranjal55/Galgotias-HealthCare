# Galgotias HealthCare

_(formerly AGON — Galgotias College Healthcare & Hostel Management)_

Mobile-first campus app that unifies hostel operations (mess, curfew) with student wellness (steps, AI mood chat, weekly health score) and automated counselor outreach.

## Roles

| Role | Login | Surfaces |
| --- | --- | --- |
| Student | Enrollment ID + password | Home, Wellness chat, Analytics + WhatsApp/Email share, Profile |
| Warden | Staff ID + password | Desk export, Mess tracker, Curfew log, Profile |
| Council | Official college email + password | Campus pulse, Directory, Counselor queue |

Demo password for seeded accounts: `Galgotias@123`

- Student: `2500971520301` (Aditya Tomar — default demo student)
- Student: `20231001234` (Ananya Sharma)
- Student: `2500971520203` (Taaha Siddiqui)
- Student: `2500971520144` (Pranjal Verma)
- Warden: `WRD104` (Neha Gupta)
- Council: `priya.nair@galgotiasuniversity.edu.in` (Priya Nair)

## Data model (unified Users + linked logs)

See `lib/schemas.ts`. Collections:

- `users` — core auth (id, name, email, passwordHash, role) + `metadata` JSON (enrollmentId / staffId / pgName / course / councilRole / mentorEmail)
- `mess_logs` — breakfast / lunch / dinner attendance
- `curfew_logs` — entry time vs 22:00 curfew
- `health_metrics` — steps, distance, calories, mental / physical / weekly scores
- `chat_messages` — AI companion transcript + sentiment
- `appointments` — counselor bookings (`source: auto | manual`)
- `notifications` — email-style alerts to student + mentor

## Auth & RBAC

`lib/auth.ts` issues a signed JWT-style session (`gch.<payload>`), hashed passwords, college-email validation for council, enrollment/staff ID format checks. `requireRole()` is the middleware equivalent used conceptually by each dashboard.

## Automated trigger

`lib/triggers.ts` → `evaluateHealthTrigger()`.

If daily mental score **or** weekly health score **≤ 50%**:

1. Create a pending counselor appointment (`source: auto`)
2. Fan out email-style notifications to the student and assigned mentor
3. Skip if an auto appointment is already open in the last 36 hours

The wellness chatbot runs lexicon sentiment analysis (`lib/sentiment.ts`) and blends it into the day's mental score, which re-runs the trigger.

## Share

Weekly student reports and warden daily logs open WhatsApp (`wa.me`) or the device mail client (`mailto:`).


## Windows quick start

Requires Node.js LTS (20.19.4+, 22.13+ or 24.3+) from https://nodejs.org/ . If Node is missing, install it, close the window and run the file again.

1. Double-click `SETUP.bat` **once**. It checks Node/npm, runs `npm install`, retries once after cleaning a broken install, then validates Expo, SDK package versions and the TypeScript build. It only says "SETUP COMPLETE" if every check passed.
2. Double-click `START PROTOTYPE.bat` **any time**. It starts the Expo web server, picks a free port (starting at 8081, never assumes it is free), waits until the server reports ready, then opens the exact `http://localhost:<port>` in your default browser. Server logs stay visible in that window; close it (or press Ctrl+C) to stop. If AGON is already running from this folder, it just opens the existing server instead of starting a duplicate. If setup was never run, it runs it for you.
3. Double-click `DEPLOY TO VERCEL.bat` to publish. It builds the production web app, verifies the output folder, signs in to Vercel if needed (browser login), links the project on first use, deploys to production, then checks the live site (home page, refresh on a client path, scripts, fonts and images) before reporting success.

Optional environment variables for `DEPLOY TO VERCEL.bat` (never stored in the repo): `VERCEL_TOKEN` (non-interactive login), `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` (non-interactive link), `AGON_VERCEL_SPEC` (Vercel CLI version, default `vercel@65`). Optional for `START PROTOTYPE.bat`: `PORT` (preferred start port), `AGON_NO_BROWSER=1`.

Other platforms / manual use: `npm install`, `npm run web` (same start logic as the BAT), `npm run build:web`, `npm run typecheck`, `npm run verify`.

The BAT files are thin launchers; the logic lives in `scripts/` (`check-node.js`, `verify-setup.js`, `dev-web.js`, `build-web.js`, `verify-deploy.js`). Keep `*.bat` files in CRLF line endings (`.gitattributes` enforces this).

## Vercel web deployment

`vercel.json` is the single source of truth: `buildCommand` is `npm run build:web`, `outputDirectory` is `dist`. `scripts/build-web.js` reads that output folder from `vercel.json` (so BAT and Vercel can never disagree), runs `expo export --platform web`, and verifies every file the bundle references exists.

- **Routing / refresh:** `app.json` uses `web.output: "single"` (one `index.html`). The rewrite in `vercel.json` sends every non-file path to the app, so refreshing or deep-linking never 404s, while missing `/_expo/*` and `/assets/*` files stay real 404s instead of returning HTML.
- **Assets:** Expo emits dependency assets (the Ionicons font, React Navigation icons) under `assets/node_modules/`, and Vercel does not publish folders named `node_modules`. The build moves that folder to `assets/vendor-modules/` and rewrites the references so icons load in production.
- **Caching:** hashed `/_expo/static/*` and `/assets/*` files are served `immutable`.
- Pushes to a Git repository connected in the Vercel dashboard use the same `vercel.json` settings.

## Important: current data-storage limitation

This package currently stores app data using React Native AsyncStorage in the browser/device. That means data is local to each browser/device and is not automatically shared between students, wardens, and council members. The current demo authentication and seeded demo accounts are also not a production-grade security system.

Vercel deployment publishes the frontend; it does not convert AsyncStorage into a central database. Before using real student information or relying on cross-user records, replace the local storage/data layer with a secure backend and shared database, and implement server-side authentication and role-based authorization. Do not enter real or sensitive student/health data into this demo deployment.


## Android Health Connect (real device data)

Students on the **Android app** can connect Health Connect from the dashboard. Steps, distance, active calories and heart rate are read **on the device** through the native SDK (`react-native-health-connect`) and stored against the logged-in student with `source: 'health_connect'`.

- **Web and iOS never show device data.** The Health Connect card says "Not connected" and the figures are labelled *Demo data*.
- Seeded figures and the "Simulate +250 steps" button are always tagged `demo`.
- Days with 0 steps are skipped on sync (treated as "no data") so an unworn phone cannot lower the wellness score and fire a counselor trigger.
- If the device does not report distance/calories, values are estimated from steps and marked with `~`.
- Needs a development or release build — it does **not** run in Expo Go:

```
npm install
npx expo prebuild --platform android      # applies plugins/withHealthConnect.js
npx expo run:android                      # or: npx eas-cli build --profile preview --platform android
```

`plugins/withHealthConnect.js` adds the read permissions, the permission-rationale intent filter, the Android 14 usage alias, the `MainActivity` permission delegate and `minSdkVersion 26`. Verify the generated `android/` folder after the first prebuild.

## Demo-only parts

Mess attendance, curfew entries and gateway/RFID flows are manual demo functionality. No hardware is integrated.
