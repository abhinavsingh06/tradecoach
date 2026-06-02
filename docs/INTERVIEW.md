# TradeCoach — Interview Cheat Sheet

A first-person guide to talking about this project in interviews: what it
does, why each choice was made, the trade-offs, and the questions you should
expect. Read top-to-bottom once, then skim before each interview.

---

## 1. The 60-second elevator pitch

> TradeCoach is a freemium mobile app for Indian retail traders. It connects
> to Zerodha Kite via OAuth, auto-syncs every fill into FIFO round-trips,
> lets you journal each trade with emotion and setup tags, and uses an AI
> coach (OpenAI GPT-4o-mini + Whisper) to draft journal entries, run
> pre-trade sanity checks, and write a weekly debrief. It ships as a React
> Native (Expo) Android app talking to a Node/Express/Postgres backend
> deployed on Render + Neon — both on free tiers. End users get all the
> data + analytics for free; AI surfaces sit behind a Pro tier with a trial
> and daily quota.

If you have 15 seconds, drop everything after “debrief.”

---

## 2. System architecture at a glance

```
┌──────────────────────┐        ┌──────────────────────────┐
│ Expo / RN mobile app │  HTTPS │ Node + Express backend   │
│  (TradeCoach)        │ ─────► │  (tradecoach-server)     │
│                      │ JWT    │                          │
│  • React Query       │        │  • Drizzle ORM           │
│  • Zustand (chat)    │        │  • Zod validation        │
│  • Wallet-card UI    │        │  • Per-domain route +    │
│  • ErrorBoundary     │        │    service modules       │
└──────────┬───────────┘        └──────┬─────────────┬─────┘
           │                           │             │
           │                           ▼             ▼
           │                  ┌─────────────┐  ┌──────────┐
           │                  │  Neon       │  │  OpenAI  │
           │                  │  Postgres   │  │  GPT +   │
           │                  │ (Singapore) │  │  Whisper │
           │                  └─────────────┘  └──────────┘
           │
           │   OAuth deep link / web redirect
           ▼
   ┌──────────────────┐
   │ Zerodha Kite API │
   └──────────────────┘
```

Two repos:
- **TradeCoach/** — Expo SDK 56 React Native client (Android + iOS, web works).
- **tradecoach-server/** — Node 22 / Express / TypeScript backend, Dockerized, deployed on Render.

---

## 3. Tech stack and why

| Layer | Choice | Why this and not that |
| --- | --- | --- |
| Mobile framework | **Expo + React Native (SDK 56)** | Single codebase for iOS + Android, fastest path to a real device, EAS Build is free for low volumes. Bare RN would have meant managing native projects myself. Flutter wasn’t a fit because the rest of my JS stack reuses the same TS types. |
| State (server) | **TanStack React Query** | Trades + plan + analytics are all server state. React Query handles cache, stale-while-revalidate, retries, and refetch-on-focus for me. Redux/Zustand for that would mean re-inventing it. |
| State (client) | **Zustand** | Used for one thing only: the AI chat transcript that needs to persist across sessions. Tiny API, AsyncStorage adapter via middleware. Nothing else lives in global state. |
| Backend | **Node 22 + Express + TypeScript** | I already had TS types on the client; sharing the contract types both ways is cheap. Express is boring and battle-tested. Fastify would have been ~10% faster but Express has more middleware. |
| ORM | **Drizzle** | Compile-time SQL with full type inference. Way lighter than Prisma (no generated client, no separate engine binary). Lets me drop to raw SQL for analytics queries. |
| DB | **Postgres (Neon)** | Free tier with serverless scale-to-zero. Postgres because I have JSONB columns (AI drafts, gate signals) and window functions (equity curves). |
| Hosting | **Render (web service) + Neon (Postgres)** | Both have proper free tiers, both deploy from Git. Render gives me a Dockerfile-based service with auto SSL and zero-config env vars. Cold starts (~30s) are the price you pay; for an Indian retail trader app where users open it during market hours and keep it warm, that’s acceptable. |
| LLM | **OpenAI (GPT-4o-mini + Whisper)** | One vendor for chat, structured output, and voice → text. GPT-4o-mini is dirt cheap (~$0.15/M input) which makes the freemium math work. |
| Auth | **Kite OAuth + signed JWT session** | Kite is the source of truth for who you are (Zerodha user ID). I mint my own JWT after the callback so subsequent calls don’t hit Kite. Session JWT in SecureStore on native, localStorage on web. |
| Build / distribution | **EAS Build → APK (preview) / AAB (production)** | Hosted Android builds without keeping Android Studio open. Internal distribution APKs are link-installable, no Play Store needed for early testing. |

---

## 4. The product loop (so you don’t blank on “what does it do?”)

1. **Login** with Kite → backend swaps `request_token` for `access_token`, mints a JWT, sends it to the app.
2. **Auto-sync** on first render — last fill cursor on the server means each sync only pulls *new* fills.
3. **FIFO round-tripping** matches opens to closes (equity + F&O). Open partials become the “Open positions” section.
4. **Journal** each closed round-trip with emotion + setup + free-text notes. Pro users can have AI **draft** the entry from similar past trades.
5. **Pre-trade gate** (Pro): name the trade you’re *about to* take, get a green/yellow/red based on plan adherence, recent tilt, and the symbol’s historical edge for you.
6. **Wellness**: morning mood check-in, loss-recovery flow if a big-loss trigger fires.
7. **Insights**: rule-based analytics (equity curve, drawdown, hour heatmap, weekday breakdown, hold-time, brokerage drag).
8. **Coach chat** (Pro): chat with an LLM that has read your full journal.
9. **Weekly narrative + daily debrief** (Pro): LLM summary of your patterns.
10. **Tax + CSV export** (free): F&O turnover and round-trip CSV.

---

## 5. Architecture decisions worth defending

### 5.1 Why the AI lives 100% server-side
- The OpenAI key never ships in a bundle (would be trivially extractable from an APK).
- Quota enforcement (`free`/`trial`/`pro`) happens before the LLM call, so abuse can’t bypass it.
- Lets me swap providers (Anthropic, Gemini, on-device) without an app release.

### 5.2 “AI Lite” mode
If the server doesn’t have `OPENAI_API_KEY` set, `/auth/me` returns `aiEnabled: false`. The client reads that flag, hides every AI surface (Coach tab, draft button, voice memo, weekly narrative, debrief). The free tier still works: trades, journal, analytics. This makes the whole project self-deployable by anyone who doesn’t want to pay OpenAI.

### 5.3 Pro gating via `aiPro` derived state
`useAuth()` exposes `aiPro = aiEnabled && entitlement?.pro`. Every gated component reads exactly that boolean. One choke point, easy to test, no scattered `if (tier === 'pro' || tier === 'trial')` checks.

### 5.4 Refactor: monolithic `client.ts` → per-domain modules
Originally everything lived in `src/api/client.ts` (~360 LOC). Split it into `auth.ts`, `trades.ts`, `coach.ts`, `gate.ts`, `wellness.ts`, `voice.ts`, `subscription.ts`, `legal.ts` behind a barrel `index.ts`. Same on the server (`routes/coach.ts` went from 945 to ~380 LOC by extracting `services/coach/*`).
- **Why**: each module touches one domain, easier to grep and to test. The barrel keeps imports clean.
- **Trade-off**: more files. Mitigated by the barrel — call sites still see one import.

### 5.5 ErrorBoundary at the root
RN render errors otherwise show a white screen on a production build. The boundary surfaces a recoverable “Try again” UI in prod, full stack in dev. Cheap to add, saves a class of bug reports.

### 5.6 Throttled `useAutoSync`
The first instinct (`useEffect → sync → invalidate → refetch`) is an infinite loop. Solved with a module-scoped `lastSyncAt` + `inflight` guard, capped at one sync per 60s per session. Single source of truth, no leaky React state for it.

### 5.7 Why I picked Neon over Render Postgres
- Render Postgres free tier expires after 90 days.
- Neon is genuinely free for hobby workloads, scales to zero, and gave me the Singapore region (~80ms RTT from India).

### 5.8 Cost calculation accuracy
Zerodha F&O charges are non-trivial: brokerage cap, STT only on sell side, exchange txn charges, GST on (brokerage + txn charges), SEBI, stamp duty. Originally I had multiple slightly-different implementations across endpoints (Today, Insights, Tax). Centralized into one `services/costs.ts` so every screen agrees. Bug fix: align the time windows (`thisMonth`, `last30Days`, `lifetime`) so the cost-drag % matches across screens.

### 5.9 Voice memos
- Recorded on-device via `expo-av` → uploaded as multipart.
- Backend pipes to OpenAI Whisper for transcription.
- Optional `structure=true` flag runs a second LLM pass to extract `{emotion, setup, notes}` from the transcript.
- Stored with status (`recording → transcribing → ready/failed`) so the UI can poll instead of holding the request open.

### 5.10 Apple Wallet-inspired UI
After two design rounds (“too generic”, “too immature”), I landed on a tactile card metaphor:
1. Soft drop shadow (the card hovers above the page).
2. Linear-gradient skin (color identity).
3. Diagonal accent wash (subtle depth).
4. Hairline top highlight + bottom shadow (the “lip” of a real card).
Combined with `PressableScale` (spring scale to 0.985 on press + haptic) it feels like a physical wallet rather than “a div with a border.”

---

## 6. Hard problems I’d highlight

1. **OAuth across native + web.** Native uses `WebBrowser.openAuthSessionAsync` + a `tradecoach://auth/complete` deep link; web does a full-page redirect to `${origin}/auth/complete?token=…`. Shared parser, two consumers. Extracted into `auth/redirect.ts` so the React provider stays small.
2. **FIFO round-trip matching for F&O.** A single instrument can have multiple BUY legs partially closed by multiple SELL legs across days. Greedy FIFO with a running cost basis per (user, tradingsymbol, product).
3. **Identity / pattern report.** Aggregating trades into an archetype (“early-day breakout, mean-revert in the afternoon”) requires bucketing by hour/setup/symbol and ranking by edge × frequency. Done as a single SQL query → reshape in Node → fed to the LLM as context.
4. **Cold-start UX.** Render free tier sleeps after 15 min idle. Surfaced a “Connecting…” spinner with a 30s hint instead of letting `fetch` time out silently. Considered moving to fly.io or a $7 Render plan; deferred until I have paying users.
5. **Freemium quota enforcement.** Per-user-per-day buckets in Postgres for each AI surface (`chat`, `draft`, `debrief`, `transcribe`). A pre-call `enforceQuota(userId, bucket)` middleware decrements before the LLM call and returns 429 with the bucket name if exceeded. Quota resets at midnight IST.

---

## 7. Trade-offs I’ll proactively call out

- **No tests yet.** The product is single-developer + pre-launch; I prioritized iteration speed over test coverage. The shape of the codebase (pure services, thin route handlers, typed contracts) is set up so tests are cheap to add when there’s a second developer.
- **No real payments.** Razorpay/Stripe integration is stubbed at `/subscription/checkout`. The freemium plumbing (entitlement, quotas, trial) is real; only the “take money” step is mocked because Play Store policy requires Google Play Billing for in-app purchases and I haven’t shipped to Play yet.
- **No CI.** Render auto-deploys on `git push`. EAS builds are manual. CI will land when I add tests.
- **No observability.** No Sentry / Datadog yet. The ErrorBoundary logs to `console.error` and Render captures stdout — fine for the current user count, not fine at scale.
- **Single LLM provider.** Provider lock-in to OpenAI. Mitigated by routing every call through one `services/llm.ts` module so swapping is a one-file change.

---

## 8. Common interview questions, prepared answers

**Q. Walk me through what happens when a user logs in.**
1. App calls `POST /auth/kite/start` with a redirect URL. Server generates a state, stores it, returns Kite’s `loginUrl`.
2. App opens an in-app browser to that URL (native) or full-page redirects (web).
3. User authenticates at Zerodha. Kite redirects to `${PUBLIC_BASE_URL}/auth/kite/callback?request_token=…&action=login&status=success`.
4. Server validates state, exchanges `request_token` for `access_token` via the Kite SDK, upserts the user row, mints a signed JWT, and either:
   - Native: 302s to `tradecoach://auth/complete?token=…` (deep link).
   - Web: 302s to the saved `redirectUrl` with `?token=…`.
5. App captures the token from the redirect, stores it in SecureStore (`localStorage` on web), and calls `GET /auth/me` to hydrate the auth context.

**Q. How do you handle Kite tokens expiring at 6 AM IST?**
- `/auth/me` returns `kite.connected: false` and `kite.expiresAt` once the access token expires.
- The dashboard surfaces a “Reconnect Kite” banner.
- API endpoints that need Kite return `401 kite_unauthorized` if the token is stale; client catches that code and triggers `refresh()` which re-renders the banner.

**Q. Why React Query instead of Redux Toolkit Query?**
RTK Query would force me into the whole Redux mental model for what is fundamentally a cache problem. React Query is purpose-built for that — staleTime, query keys, mutation invalidation. Zustand handles the one piece of *client* state (chat history). Two small libraries beat one large one when the domains are this different.

**Q. How do you keep mobile + web UI in sync?**
- Shared component primitives in `src/components/` (WalletCard, Glass, Button, PressableScale).
- Theme tokens (`utils/theme.ts`) for colors, spacing, radius, typography — every component reads from there.
- `Platform.select()` for the handful of places where web needs a CSS-only override (e.g. `boxShadow` because RN shadow props don’t translate to react-native-web cleanly).

**Q. How do you prevent abuse / cost runaway on the LLM?**
- Server-only LLM access (no key in the bundle).
- Per-user-per-day quotas in Postgres, enforced before every call.
- Tier check (free vs trial vs pro) before quotas.
- Hard 402 / 429 responses with a typed error code the client uses to render the paywall vs the quota-reached UI.
- GPT-4o-mini chosen for cost. Whisper is cheap enough that I quota by *count* not by duration.

**Q. What’s the data model?**
Core tables: `users`, `kite_sessions`, `entitlements`, `quotas`, `fills`, `round_trips`, `journal_entries`, `ai_drafts`, `plans`, `daily_reviews`, `weekly_reports`, `pre_trade_gates`, `mood_checkins`, `loss_recoveries`, `voice_memos`. All have `userId` FK; queries are always scoped by user.

**Q. How do you deploy?**
- Backend: `git push` → Render runs Docker build → restart with new image. Schema migrations via `npm run db:push` (Drizzle Kit) from the Render shell.
- Mobile: `eas build --profile preview --platform android` → installs as APK from a link. Production builds go to Play Store as AAB.

**Q. Biggest mistake / what would you do differently?**
Two:
1. Should have written the LLM module first and the route handlers second. I duplicated the `enforceQuota → call LLM → persist → return` pattern across endpoints before extracting it into `services/coach/*`.
2. Originally I put cost calculations in three places. Caused a UI bug where “cost drag” showed different numbers on Today vs Insights. Now there’s one `services/costs.ts` and one set of time windows.

**Q. How would you scale this to 10× users?**
1. Drop the Render free tier — pin to a paid tier or move to Fly.io for region-pinning to Mumbai.
2. Add a worker process for the heavy LLM endpoints (weekly narrative, identity) so the web dyno isn’t blocked. BullMQ + Redis.
3. Cache `/coach/today` and `/coach/analytics` per user with a short TTL (these aren’t real-time).
4. Add a CDN in front of static legal pages and the Render web service for cold-start mitigation.
5. Sentry for client + server error reporting.
6. Move from `db:push` to versioned migrations (Drizzle Kit `generate` + `migrate`) once there’s any team.

**Q. Why a freemium model?**
- The non-AI features (sync, journal, analytics, tax) have real value standalone — that’s the free tier and the growth engine.
- The AI features have a marginal cost per call. Pricing them at ₹X/month for a quota covers OpenAI bills and leaves a margin.
- Trial removes friction; quota stops abuse.

---

## 9. Numbers / metrics worth memorizing

| | |
| --- | --- |
| Backend LOC | ~6.5k TypeScript |
| Mobile LOC | ~10.7k TypeScript / TSX |
| Routes | 9 domains (`auth`, `trades`, `coach`, `gate`, `wellness`, `voice`, `subscription`, `plans`, `legal`) |
| Tables | ~15 |
| Average LLM call cost (GPT-4o-mini) | ~₹0.05–0.10 |
| Whisper per-memo cost | ~₹0.50 for a 30s memo |
| Render cold start | ~30s |
| Neon free tier | 0.5 GB storage, 191 compute hours/mo |
| Free tier quotas (per day) | Chat 20, draft 30, debrief 5, transcribe 10 |

---

## 10. Failure stories I’ll volunteer (humility is a green flag)

1. **`PUBLIC_BASE_URL` missing on first Render deploy.** Spent 10 minutes staring at “Exited with status 1” before reading the *deploy* logs (vs the runtime logs). Now I read both first.
2. **`rootDir: tradecoach-server` in `render.yaml`.** That was correct in the monorepo but wrong when I split the server into its own repo. Fixed by removing the property.
3. **EAS project ID placeholder.** `app.json` shipped with `REPLACE_WITH_EAS_PROJECT_ID`. `eas init` failed with “Invalid UUID appId” until I cleared the placeholder, then it created the real project.
4. **Dialog UI clipping after switching to WalletCard.** Cards lost their top edge against the dark canvas. Fixed by adding an explicit `boxShadow` on web and increasing the top highlight border, because RN shadow props don’t map cleanly through `react-native-web`.

---

## 11. What I’d add next (shows direction)

1. Razorpay (or Play Billing) integration to ship the Pro tier.
2. Push notifications on the morning mood check-in + market open / close.
3. On-device LLM (Llama 3 8B int4) for the AI draft as a “free” option — keeps OpenAI for the heavier surfaces.
4. Pattern alerts: detect setups in your real trades that match a “winning playbook” and surface them as a notification.
5. Backtester: feed your tagged setups into historical NSE data, show what your edge would have been.
6. Web app at parity (the Expo Web build mostly works already).
7. Migration to Drizzle Kit versioned migrations.
8. Sentry + Posthog.

---

## 12. Leveled Q&A bank (easy → very hard)

Each question has a **short answer** (what to actually say in 30–60s) and a
**likely follow-ups** list (so you know where the conversation goes next and
can pre-load the answer).

### LEVEL 1 — Warm-up (HR / screening / first-round)

**Q1. Tell me about a project you’re proud of.**
- *Answer:* TradeCoach. Full-stack mobile app for Indian retail traders.
  Connects to Zerodha Kite, auto-pulls trades, lets you journal each one,
  and uses an AI coach to surface patterns. I built the React Native app,
  the Node/Postgres backend, the AI integration, and the deployment to
  Render and Neon — both on free tiers.
- *Follow-ups:* Why this problem? Who’s the user? How long did it take?
  What did you ship vs cut?

**Q2. What tech did you use and why?**
- *Answer:* Expo + React Native for one codebase across Android/iOS, Node
  + Express + TypeScript on the backend, Drizzle ORM with Postgres on
  Neon, OpenAI for LLM features, React Query for server state, Zustand for
  the chat history, EAS for Android builds, Render for hosting.
- *Follow-ups:* Why not Flutter? Why not Next.js? Why TypeScript both
  sides? Why not Prisma?

**Q3. What does the app do in one sentence?**
- *Answer:* A trading journal that syncs your Zerodha fills automatically
  and uses AI to spot the emotional patterns that cost you money.
- *Follow-ups:* Who would pay for this? What’s your differentiator?

**Q4. Is it live? How do users get it?**
- *Answer:* Backend is live on Render at `tradecoach-api.onrender.com`,
  Postgres on Neon. The mobile app ships as an APK via EAS internal
  distribution today; Play Store submission is the next step.
- *Follow-ups:* How many users? What’s your launch plan?

**Q5. What’s a freemium model in this context?**
- *Answer:* Free tier covers everything that doesn’t cost me money per
  call: Kite sync, journaling, analytics, tax export. Pro unlocks AI
  surfaces — coach chat, AI-drafted journal, weekly narrative, pre-trade
  gate, voice memos. There’s a free trial and per-day quotas so abuse
  can’t bankrupt me.
- *Follow-ups:* Why this split? How do you price it? How do you stop me
  from making 10 free accounts?

---

### LEVEL 2 — Practical / mid-level

**Q6. Walk me through what happens when a user opens the app for the first time.**
- *Answer:*
  1. App boots → `AuthProvider` checks SecureStore for a JWT.
  2. No token → renders `LoginScreen`.
  3. User taps Connect with Kite → app calls `POST /auth/kite/start`,
     gets a Zerodha login URL.
  4. App opens an in-app browser to that URL. User authenticates.
  5. Kite redirects back to my backend with a `request_token`.
  6. Backend exchanges it for an `access_token`, upserts the user, mints
     a JWT, redirects to `tradecoach://auth/complete?token=…`.
  7. App captures the deep link, stores the JWT, calls `GET /auth/me` to
     hydrate user + entitlement + AI flag, then mounts the tabs.
- *Follow-ups:* What if the user cancels mid-flow? How do you handle the
  web case (no deep links)? What if the JWT is expired? How do you stop
  CSRF in the OAuth state?

**Q7. How does trade sync work?**
- *Answer:* On first render of the tabs, `useAutoSync` calls `POST
  /trades/sync` (throttled to once per 60s per session). The server pulls
  the day’s fills from Kite, dedupes against what’s already in Postgres,
  and runs the FIFO matcher to pair buys and sells into round-trips. Open
  positions are whatever doesn’t pair off. The app refetches `GET
  /trades` after sync.
- *Follow-ups:* What if Kite returns 1000 fills? How do you avoid the
  sync-invalidate-refetch infinite loop? What if two devices sync at the
  same time? How do you handle a partial Kite failure?

**Q8. How is state managed on the client?**
- *Answer:* Three layers. (1) React Query owns *server state* — trades,
  positions, today, weekly, plan, mood, recovery, costs, analytics, etc.
  Every endpoint has a typed hook in `src/hooks/`. (2) Zustand owns the
  *chat transcript*, persisted to AsyncStorage. (3) React context
  (`AuthProvider`) owns the user, entitlement, and the derived `aiPro`
  boolean — everything Pro-gated reads from there.
- *Follow-ups:* Why not Redux? When would you reach for Zustand vs Context?
  How do you invalidate caches after a mutation? What’s `staleTime` set
  to and why?

**Q9. How do you secure the OpenAI API key?**
- *Answer:* It’s never in the bundle. The app calls *my* backend, the
  backend calls OpenAI. Extracting the JS bundle from an APK would never
  expose the LLM key. Quotas + entitlement checks happen server-side
  before the OpenAI call, so even an abusive user can’t bypass them.
- *Follow-ups:* What about Kite’s API secret? Where do you store the JWT
  signing secret? How do you rotate?

**Q10. How is the database structured?**
- *Answer:* ~15 tables. Core: `users`, `kite_sessions`, `entitlements`,
  `daily_quotas`. Trading: `fills`, `round_trips`, `journal_entries`,
  `ai_drafts`, `plans`. Coach: `daily_reviews`, `weekly_reports`,
  `pre_trade_gates`, `voice_memos`. Wellness: `mood_checkins`,
  `loss_recoveries`. Everything has `userId` FK; every query is scoped.
  JSONB columns for AI drafts and gate signals so I can evolve the shape
  without migrations.
- *Follow-ups:* Why JSONB and not normalized columns? How would you index
  for the analytics queries? Why one table for fills *and* round trips
  instead of generating round trips on the fly?

**Q11. How do you deploy?**
- *Answer:* Backend: push to GitHub → Render auto-builds the Dockerfile
  → restarts with the new image. Schema migrations are manual via `npm
  run db:push` from the Render shell — I’ll switch to versioned
  migrations once there’s a team. Mobile: `eas build --profile
  preview --platform android` produces an APK, internal distribution by
  link. Production builds are AABs for Play Store.
- *Follow-ups:* How long does a deploy take? How do you roll back? What
  if the migration fails partway? How do you handle zero-downtime?

**Q12. How do you handle errors on the client?**
- *Answer:* Three layers. (1) `ApiError` thrown by the HTTP helper
  carries `status` and `code` so call sites can branch on the typed
  reason (`pro_required`, `daily_quota_exceeded`, `kite_unauthorized`,
  `network_error`). (2) React Query surfaces errors per query/mutation.
  (3) A top-level `ErrorBoundary` catches anything that escapes render
  and shows a recoverable “Try again” UI — white-screen prevention.
- *Follow-ups:* What about unhandled promise rejections? How do you
  collect crash reports? Why no Sentry yet?

**Q13. How does the FIFO round-tripping actually work?**
- *Answer:* Per `(userId, tradingsymbol, product, side)`, I keep an
  ordered queue of opening fills with remaining quantity. When a closing
  fill arrives, it greedily eats from the queue front: take from the
  oldest open lot first, decrement its remaining qty, when it hits zero
  pop it. Produces zero-or-more closed round-trips per close. Average
  entry/exit prices are weighted by qty matched.
- *Follow-ups:* What about partial fills? Same-day intraday squaring?
  What if a sell comes in before the corresponding buy is in the DB? How
  do you handle BO/CO product modifications?

**Q14. How do you cross-test mobile + web from one codebase?**
- *Answer:* Most components are pure RN. For the handful that need
  platform tweaks (BlurView intensity differs, RN shadows don’t
  translate to react-native-web → use CSS `boxShadow` on web), I use
  `Platform.select()` or `Platform.OS` guards. Storage too: SecureStore
  on native, localStorage on web — abstracted behind `auth/session.ts`.
- *Follow-ups:* What breaks first on web? Have you actually shipped the
  web build? What about responsive layout?

**Q15. Why Drizzle over Prisma?**
- *Answer:* Lighter — no generated client, no separate query engine
  process. Compile-time SQL with full type inference. Lets me drop to
  raw SQL for the analytics queries (window functions, lateral joins)
  without losing types. Migrations are a CLI you bring yourself rather
  than a black box.
- *Follow-ups:* What do you give up vs Prisma? What about query
  composition? How do you handle relations?

---

### LEVEL 3 — Architecture & design

**Q16. The same cost calculation showed different numbers on the Today page
vs the Insights page. What happened and how did you fix it?**
- *Answer:* Two separate implementations had drifted: rounding order
  differed, and the time-window definition for “this month” was
  inclusive on one side and exclusive on the other. Fix was three-part:
  (1) centralize cost math in `services/costs.ts` — one function,
  Zerodha’s F&O formula in one place. (2) Define windows once
  (`thisMonth`, `last30Days`, `lifetime`) in `services/timeWindows.ts`.
  (3) Both endpoints call the centralized functions. Bug closed and
  cannot reopen because there’s no second implementation.
- *Follow-ups:* How did you catch it? Why didn’t a unit test catch it?
  How do you stop this class of bug going forward?

**Q17. Walk me through the freemium quota system.**
- *Answer:* A `daily_quotas` table keyed by `(userId, bucket, date)`
  with a `count` column. Each AI surface (`chat`, `draft`, `debrief`,
  `transcribe`, `gate`) is a bucket with a free-tier cap. Middleware
  `enforceQuota(bucket)` runs before the LLM call:
  1. Look up entitlement. Pro/trial → skip cap.
  2. Atomic UPSERT increment of the count.
  3. If count exceeds cap → roll back and return 429 with `daily_quota_
     exceeded` + bucket name.
  4. Otherwise proceed.
  Resets at midnight IST because that’s when the trading day rolls.
- *Follow-ups:* What if I have two requests in flight that both succeed
  the check before either persists? Why IST and not UTC? How do you stop
  someone creating new accounts to multiply quotas? How would you
  distribute this across multiple backend instances?

**Q18. How do you prevent the LLM bill from running away?**
- *Answer:* Five lines of defense.
  1. Server-side only — key never in the bundle.
  2. Auth: must be a signed-in user.
  3. Entitlement: free tier can only call cheap surfaces.
  4. Per-day quota: even Pro users have a cap that protects against
     bug-driven loops.
  5. Model choice: GPT-4o-mini for everything, max_tokens caps on every
     call. Whisper quotas by *count* not duration.
  Plus a kill switch — unset `OPENAI_API_KEY` on Render and every AI
  surface goes dark via Lite mode within one cold-start cycle.
- *Follow-ups:* Cost per active user per month? How would you know
  *before* the bill arrived that something’s wrong? What’s missing?

**Q19. How would you scale this to 10,000 daily active users?**
- *Answer:* Five moves.
  1. Drop the Render free tier; pin to Mumbai region on a paid Render or
     Fly.io plan to kill cold starts and cut RTT.
  2. Add a worker tier (BullMQ + Redis) for heavy LLM endpoints (weekly
     narrative, identity, debrief). Web tier returns 202 + job id, app
     polls. Keeps the request-response cycle short.
  3. Cache `/coach/today` and `/coach/analytics` per user with a 60s TTL
     in Redis. These are read-heavy and not real-time.
  4. Read replica on Neon for analytics queries.
  5. Move LLM calls behind a per-tenant rate limiter and a circuit
     breaker so an OpenAI outage doesn’t exhaust connection pools.
  And operationally: Sentry + structured logs + a dashboard for the four
  numbers that actually matter (DAU, LLM spend, error rate, p95).
- *Follow-ups:* Why not Lambda? How do you handle the worker dying
  mid-job? What about the Postgres connection pool? Would you shard?

**Q20. The Render service sleeps after 15 minutes idle. How do you handle
the 30-second cold start?**
- *Answer:* Three things. (1) UX: first request shows a “Reconnecting…”
  toast with a 30s hint instead of a silent timeout. (2) The retry
  logic in the React Query default is `retry: 1` with backoff, which
  covers the cold-start window for follow-up requests. (3) For
  reliability I’d add a tiny external cron pinging `/health` every 10
  min — but that’s a band-aid. Real fix is paying for an always-on
  instance once paying users justify it.
- *Follow-ups:* Why not pre-warm with cron? Can you serve a degraded
  response from the edge while waking up? What’s the user-perceived
  P50/P95 today?

**Q21. What was your biggest refactor and why?**
- *Answer:* The backend `routes/coach.ts` ballooned to 945 LOC — every
  AI feature had its prompt, its persistence, its LLM call, and its
  quota check all in one route handler. I split it into:
  - `services/coach/{chat,draft,debrief,weekly,identity,gate,tax,export}.ts`
    — pure business logic, one file per feature.
  - `services/prompts.ts` — shared persona + trade-summary helpers.
  - `services/vocab.ts` — emotion / setup vocabularies + sanitizers.
  - `repos/trades.ts` — the closed-round-trip query used by 4 handlers.
  - Routes shrank to ~380 LOC, became thin HTTP adapters: validate
    input, enforce quota, call service, persist, map errors → status.
  Same playbook on the client: `api/client.ts` (364 LOC monolith) → 8
  per-domain modules behind a barrel. Every screen still imports from
  `'../api'` so nothing churned at call sites.
- *Follow-ups:* What did you delete? How did you decide module
  boundaries? Did this break anything? How do you stop it ballooning
  again?

**Q22. Why no tests yet, and how would you start?**
- *Answer:* Honest answer: pre-launch single-developer, I optimized for
  iteration speed. The shape of the code is test-friendly — pure
  services with no I/O, thin route handlers, typed contracts both
  sides — so tests are cheap to bolt on. Order I’d add them:
  1. Pure functions first: cost calculator, FIFO matcher, quota math.
     Vitest, fast, high value.
  2. Service layer: spin up a real Neon branch DB per test (or pgmock),
     test the `services/coach/*` modules end-to-end without HTTP.
  3. Contract tests: hit the live backend in CI with a known fixture
     user, assert response shapes match the TypeScript types.
  4. Client component snapshots only for stable primitives (WalletCard,
     Glass). Skip snapshots on screens — they churn.
  5. Detox E2E for the auth flow + sync. Only one or two paths.
- *Follow-ups:* How do you mock Kite? How do you test the OAuth
  redirect? What’s your CI plan?

**Q23. Walk me through the AI pipeline for "draft a journal entry."**
- *Answer:*
  1. App: `POST /coach/journal/:tradeId/draft`.
  2. Route handler: validate trade id, check user owns it, enforce
     `draft` quota.
  3. Service `services/coach/draft.ts`:
     a. Load the trade + the last N closed trades on the same symbol
        (`repos/trades.ts`).
     b. Build a prompt: persona + summarized historical context +
        “draft an emotion, setup, and notes for this trade.”
     c. Call OpenAI with `response_format: json_object` and a schema.
     d. Sanitize (emotion must be in the allowed vocab; setup too).
  4. Route handler persists the draft to `ai_drafts`, returns it.
  5. App shows the draft as a separate card the user can `Accept`
     (writes to `journal_entries`) or edit before accepting.
  Key design point: the draft is *never* silently applied — the user
  always has the last word. That keeps trust intact.
- *Follow-ups:* What if the LLM returns invalid JSON? How do you cap
  tokens? What’s in the persona prompt? How do you stop prompt
  injection from journal text?

**Q24. How do you handle Kite tokens expiring at 6 AM IST?**
- *Answer:* Two-sided detection. The server stores `kite_sessions.expires_
  at`; `/auth/me` returns `kite.connected` (true if not expired) and
  `kite.expiresAt`. Any endpoint that needs Kite returns `401
  kite_unauthorized` if the token is dead. The client’s `useSyncTrades`
  catches that code, calls `refresh()` on the auth provider, which
  flips `kiteConnected` to false, which makes the dashboard show a
  “Reconnect Kite” banner. User taps it → same flow as initial login,
  except we already have their `user.id`.
- *Follow-ups:* Why not refresh tokens transparently? What if a user
  starts a sync at 5:59 and finishes at 6:01?

**Q25. Why does the AI live entirely server-side instead of on-device or
in the client calling OpenAI directly?**
- *Answer:* Three reasons.
  1. **Security** — any key shipped in the bundle is extractable from
     an APK in 10 minutes. Server is the only safe holder.
  2. **Cost control** — quotas + entitlements must be enforced in a
     place the user can’t bypass. Client-side checks are advisory
     only.
  3. **Iteration speed** — I can swap models (GPT → Claude → Llama),
     change prompts, A/B test, all without an app release. The client
     contract is stable; the server can evolve freely.
  The downside is the round-trip latency. For latency-sensitive
  features I’d add a small on-device model in front (Llama 3 8B
  int4 for journal drafts) and keep the server LLM for the heavy
  surfaces.
- *Follow-ups:* What if your server is down? How do you handle the
  rate limit hitting?

---

### LEVEL 4 — Hard / staff-level

**Q26. Two web requests increment the same user’s quota at the same
millisecond. Both pass the “under cap” check, both succeed. The user
got two free LLM calls when they should have got one. How do you fix?**
- *Answer:* The bug is a check-then-act race. Three fixes ordered by
  preference.
  1. **Make the increment atomic and authoritative.** `INSERT ...
     ON CONFLICT (user_id, bucket, day) DO UPDATE SET count = count + 1
     RETURNING count`. *Then* compare the returned count to the cap.
     If over, refund (decrement back) and return 429. Single SQL
     statement, race-free.
  2. **Or** an advisory lock keyed by `(user_id, bucket)` around the
     whole check-then-act block.
  3. **Or** move the counter to Redis with `INCR` + a TTL of one day,
     read the value back, compare. Faster but adds a new dependency.
  I went with #1 because it’s in the data store I already have.
- *Follow-ups:* What about partial failure of the LLM call after the
  counter has incremented? Show me the refund logic. How do you reset
  daily quotas — cron, or just date-keyed rows?

**Q27. You’re adding a second LLM provider (Anthropic) so OpenAI isn’t a
single point of failure. Design the abstraction.**
- *Answer:* A `LLMProvider` interface with two methods: `chat(messages,
  opts): Promise<{text, model, usage}>` and `transcribe(audio,
  opts): Promise<{text}>`. Concrete impls: `OpenAIProvider`,
  `AnthropicProvider`. A `LLMRouter` selects per-call by:
  - **Feature requirement** — Whisper is OpenAI-only today, so
    `transcribe` always routes there.
  - **Health** — circuit breaker per provider. If OpenAI is failing
    > 50% over the last 60s, fall back.
  - **Cost / latency policy** — chat goes to whichever provider has
    the lowest cost-per-token for the requested capability.
  Persistence: store `model` alongside every output so I can A/B
  analyze quality later. Prompts live provider-neutrally; per-provider
  adapters do the small differences (e.g. system message vs `system:`
  prefix).
- *Follow-ups:* What about streaming? How do you keep prompt parity
  across providers? How do you A/B fairly when prices differ? What if
  Anthropic supports a 200k context that OpenAI doesn’t — how do you
  decide what to send?

**Q28. The CEO wants real-time alerts when a user is about to overtrade.
Currently overtrading is computed on-demand when they open the app.
Design the change.**
- *Answer:* Three layers.
  1. **Detection.** Push the overtrading score computation into a
     post-trade-sync step. After every sync, recompute and compare
     against the user’s median. If level escalated to `high`/`extreme`,
     emit an event.
  2. **Delivery.** Expo push notifications via Expo’s service. Store
     `push_token` per device, dedupe.
  3. **Cooldown + relevance.** Don’t spam. One alert per (user, level
     transition) per trading day. Quiet hours outside market hours.
     User-controllable in Settings.
  At scale this is a worker queue: `sync` enqueues `evaluateAlerts(userId)`,
  the worker checks and possibly fires a push. Keeps the sync request
  fast and decouples failure modes.
- *Follow-ups:* What if the user has the app open? How do you guarantee
  delivery? What about the cost of push at 10× users?

**Q29. Walk me through a hot path for performance. Where would you focus
first?**
- *Answer:* The hot path is **app boot → first trades render**. Today
  that’s:
  1. JS bundle parse (~1.5s on a mid-tier Android).
  2. `AuthProvider` boot → SecureStore read (sync) → `/auth/me` (network).
  3. Tabs mount → `useTradesQuery` + `useTodayQuery` + `usePositionsQuery`
     + `useAutoSync` fire in parallel.
  4. Render trades.
  Wins ranked by leverage:
  - **Parallelize hydration** — already parallel via React Query;
    nothing to do.
  - **Cache `/auth/me`** on the client with a short TTL so warm boots
    skip the round-trip. Today it’s every boot.
  - **Server-side: precompute `/coach/today`** on sync end. Today it
    runs an analytical query per request. Cache it in Postgres, bust
    on sync.
  - **Bundle size**: Hermes engine on (it is), remove `expo-av` lazy
    imports for the screens that don’t use it.
  - **Cold start of Render**: covered above.
  Measure before optimizing — I don’t have RUM today, that’s the very
  first add.
- *Follow-ups:* How would you measure JS parse time on a real device?
  What’s your budget for first paint? How do you know caching `/auth/me`
  doesn’t serve stale entitlement?

**Q30. The Postgres schema is going to grow. What’s your migration
strategy as you go from 1 → 100 → 10,000 users?**
- *Answer:* Phases.
  - **1 user (today)**: `drizzle-kit push` — generates SQL from schema
    and applies. Zero ceremony, fits a single dev.
  - **2 to N developers (~10 users)**: switch to `drizzle-kit
    generate` + `drizzle-kit migrate` so migrations are versioned
    files in git. Every PR includes its migration. CI runs `migrate`
    against an ephemeral DB to catch breakage.
  - **100 users**: add a pre-deploy migration step in Render. Block
    deploy if migration fails. All migrations are expand-then-contract
    — add columns nullable, backfill, switch readers, drop old, in
    separate releases.
  - **10,000 users**: add a soak step — apply to a staging branch DB
    on Neon, run a real-traffic replay, then promote. Long-running
    migrations get an explicit lock-timeout and are split into
    background-fillable jobs (e.g. backfill via `UPDATE … WHERE id
    BETWEEN`).
  The throughline: every migration is reversible *or* additive-only.
  No table renames without a deprecation cycle.
- *Follow-ups:* Tell me about a hard migration you’d have to do here.
  How do you handle JSONB schema changes? What if a migration takes 30
  minutes — how do you deploy without downtime?

**Q31. A user requests account deletion. Walk me through it end-to-end,
including the parts that aren’t obvious.**
- *Answer:*
  1. **UX**: confirmation dialog — “This deletes all trades, journals,
     AI drafts, mood data. Cannot be undone.” Require typing username
     or a long-press confirm.
  2. **API**: `DELETE /auth/me` (already wired).
  3. **Server**:
     a. Authn check.
     b. Transactional cascade delete keyed off `userId` — every table
        has the FK with `ON DELETE CASCADE`, so one delete on `users`
        triggers all child rows.
     c. Revoke Kite session if present.
     d. Invalidate the JWT (add jti to a denylist with TTL = token
        lifetime).
     e. Audit log (separate table, retains only the deletion event
        + timestamp + reason).
  4. **Client**: clear SecureStore, reset zustand chat, navigate to
     `LoginScreen`.
  5. **Compliance**:
     - Backups: Neon point-in-time recovery keeps deleted data for 7
       days. Documented in the privacy policy.
     - LLM provider: OpenAI by default doesn’t train on API data and
       deletes after 30 days. Documented.
     - Push tokens: removed from our DB, but the device-side token
       persists until app uninstall — out of our control.
  6. **Play Store requirement**: an account-deletion *URL* (a web
     page that explains how to delete) — already wired via the
     `/legal/links` endpoint.
- *Follow-ups:* What if deletion fails halfway? GDPR right-to-be-
  forgotten compatibility? How do you stop a malicious admin from
  reading the audit log?

**Q32. Pitch me on consolidating to a single repo (mobile + server) or
keeping them separate. Defend either.**
- *Answer:* I had it as a monorepo, then split. The case **for split**:
  independent deploy cadence (mobile takes days through review, server
  ships in 5 min), separate CI configs, separate Dockerfile context,
  fewer surprise “my mobile PR broke server build” moments, easier to
  open source one side. The case **for monorepo**: shared types (today
  duplicated by hand), atomic cross-cutting changes (an endpoint and
  its client hook in one PR), one place for issues. The right answer
  depends on team size. Solo / small team with two repos works if you
  publish the types as a private npm package or just keep them in sync
  manually — which is what I do. At 3+ engineers I’d move back to a
  monorepo with Turborepo + a `packages/contracts` package. The cost
  of the duplication grows superlinearly with people.
- *Follow-ups:* How do you keep contracts in sync today? Show me a
  refactor where this hurt. What about deploy coupling?

**Q33. Design an offline mode for the mobile app.**
- *Answer:* What can work offline:
  - **Read** of already-synced trades, journals, plans, mood entries —
    React Query persists its cache to AsyncStorage.
  - **Write** of journal entries and mood check-ins — queue mutations
    locally, retry when network returns. Use React Query’s
    `pause-on-offline` + a custom persistence adapter.
  - **AI** anything requires network — show a clear “AI needs internet”
    state.
  - **Sync** requires network — show last-synced timestamp and a
    “you’re offline” banner.
  Conflict resolution: server is the source of truth for trades (they
  come from Kite). For journal entries, last-write-wins keyed by
  `tradeId` is fine — no concurrent edits expected on a personal app.
  For voice memos: hold the local audio file, upload on reconnect,
  show transcribing state. Storage budget: cap local audio at 100 MB,
  oldest-first eviction.
- *Follow-ups:* What if I edit a journal entry offline on two devices?
  How do you migrate the persisted cache across schema changes? What
  about secure storage of journal contents while offline?

**Q34. The AI replies sometimes contain hallucinated trade IDs or
fabricated numbers. What’s your strategy?**
- *Answer:* Two strategies, layered.
  1. **Prevent**: structure the prompt so the model isn’t generating
     numbers — pass it precomputed aggregates ("you traded NIFTY 47
     times, won 24, average win 4200, average loss -3100") and ask it
     to *narrate*, not *calculate*. The model is bad at math; my
     Postgres isn’t.
  2. **Validate**: for any structured output (journal drafts, gate
     verdicts, weekly narratives), enforce a JSON schema with
     `response_format`. Reject responses that reference symbols the
     user hasn’t traded, setups outside the vocab, or numbers wildly
     outside computed aggregates. Show the user a "regenerate" CTA on
     reject.
  Hard rule: numbers in user-facing output come from SQL, not from the
  LLM. The LLM is a presentation layer for facts I’ve already proven.
- *Follow-ups:* How do you stop prompt injection from a journal note?
  What about a malicious tradingsymbol? How do you A/B prompt changes
  without regressing?

**Q35. You discover a security bug — the JWT signing key was committed to
git two months ago and the repo is public. What do you do, in order?**
- *Answer:* Immediate, in this order:
  1. **Rotate the JWT secret in Render env vars NOW.** This invalidates
     every existing token and forces re-login. Cost: every user
     re-logs in. Acceptable.
  2. **Force-push history rewrite** to remove the key from git, then
     `git rebase --onto` for any open PRs. Note: GitHub caches forever
     for a while; treat the key as compromised regardless.
  3. **Audit logs** for the period since commit to look for token
     forgery indicators (impossible IPs, odd user-agent sequences).
  4. **Disclose** to users if there’s any evidence of misuse — same
     day, in plain language.
  5. **Post-mortem**: add `git-secrets` or `truffleHog` to a pre-commit
     hook; move all secrets to a `.env` that’s gitignored at the repo
     root and root-level `.gitignore`; document the rotation runbook.
  6. **Defense in depth**: shorten JWT TTL, add refresh tokens with
     server-side revocation, add a `jti` denylist so individual tokens
     can be killed without rotating the whole secret.
  The principle: rotate first, ask questions later. Damage compounds
  with delay.
- *Follow-ups:* What if the Kite API secret leaked instead? What if
  it’s the OpenAI key? How does your answer change?

**Q36. Walk through your error-handling philosophy with concrete examples.**
- *Answer:* Three levels, by audience.
  1. **Programmer**: TypeScript at compile time + Zod at the boundary.
     Bad input never reaches business logic. Errors thrown at the
     boundary are typed.
  2. **Operator**: structured logs (today: stdout, eventually: Datadog
     / Logflare). Every error log includes `userId`, `requestId`,
     `endpoint`. Stack traces in dev, message only in prod.
  3. **User**: typed `ApiError` with a `code` field. Client maps codes
     to friendly UI:
        - `pro_required` → paywall modal.
        - `daily_quota_exceeded` → quota-hit toast + Pro upsell.
        - `kite_unauthorized` → reconnect banner.
        - `coach_offline` → "AI is unavailable" empty state.
        - `network_error` → "Check connection" with retry.
     Never show a stack trace to a user. Never show an unmapped 500
     except as a generic “Something went wrong.”
  The `ErrorBoundary` is the safety net for unmapped render-time
  exceptions — recoverable UI, not a white screen.
- *Follow-ups:* How do you correlate a client error report with the
  exact server log? What about errors that only happen after the
  request returns 200?

---

### LEVEL 5 — Curveballs, behaviorals, and the meta

**Q37. What’s the worst code in the repo today, and what would you do
about it?**
- *Answer:* `DashboardScreen.tsx` is 1531 LOC — the screen owns layout,
  data fetching orchestration, sync triggering, modal state for three
  modals, and inline styles for ten cards. It’s readable but it’s the
  next refactor target. I’d split it into:
  - `DashboardHero.tsx` — greeting + day P&L card.
  - `DashboardPlan.tsx` — today’s plan card + modal.
  - `DashboardSync.tsx` — last sync + sync button.
  - `DashboardPositions.tsx` — open positions list.
  - `DashboardModals.tsx` — colocated portal for all three modals.
  - `useDashboardData.ts` — aggregates the four queries the screen
    needs.
  After: each file is < 250 LOC and testable in isolation.
- *Follow-ups:* Why hasn’t it been done? What stops it growing again?

**Q38. What’s the smallest change that would have the biggest impact?**
- *Answer:* Sentry. Today every production error vanishes into the
  ether. Two hours of work, 100× the debugging signal.

**Q39. You have one engineer-week. What do you build?**
- *Answer:* Razorpay (or Google Play Billing) end-to-end so I can take
  money. Everything downstream of having a paid user — retention
  emails, cohort analysis, churn metrics — requires having a paid user
  in the first place. Today my entitlement plumbing is real but the
  `/subscription/checkout` endpoint is a stub.

**Q40. Tell me something you’d cut from this product if you had to.**
- *Answer:* Voice memos. It’s technically the coolest feature — record
  → Whisper → structured extraction → journal entry — but I haven’t
  validated that users want to talk into a phone after a trade vs typing
  three words. The infra (multer upload, Whisper integration, async
  job) is real cost. I’d gate it behind real usage data and cut it if
  < 5% of Pro users use it monthly.

**Q41. Why hasn’t someone else built this?**
- *Answer:* They have, sort of — there are trade journals (TraderSync,
  Edgewonk) and there are broker dashboards. What there isn’t is:
  (a) tight Kite integration for Indian retail, (b) emotion-tagging
  + AI mirror as the core loop rather than a feature bolt-on, (c) a
  pre-trade *gate* that actually blocks you with context from your own
  history. The closest competitors are US-focused or B2B (prop-firm
  tooling). My bet is that Indian F&O traders are big enough, lose
  badly enough, and use Kite enough that a focused tool wins.

**Q42. What would you do differently if you started over?**
- *Answer:* Three things.
  1. **Write the LLM module first**, route handlers second. I built
     the same `enforceQuota → call LLM → persist → return` pattern
     four times before extracting it.
  2. **Pick the time-window definition once** (`thisMonth` = first of
     calendar month to now, IST) and use it everywhere. Cost me a UI
     bug.
  3. **EAS project on day one.** I shipped without it, then had to
     deal with the placeholder-projectId mess when wiring builds.
  I would not change: TypeScript both sides, Drizzle, the Wallet
  card UI metaphor, or the AI-server-only architecture.

**Q43. How do you decide what to build next?**
- *Answer:* Two questions: (1) Does it remove friction from the
  smallest valuable loop (open app → see a useful insight)? (2) Will
  five real users feel it next week? If neither, defer. Today that
  means: payments before backtester, push notifications before web
  parity.

**Q44. Anything you’re intentionally NOT doing?**
- *Answer:* Yes. (1) No order placement — I deliberately don’t take
  trades for users. Liability is one mistake away, and Kite doesn’t
  meaningfully differentiate UX from its own app. (2) No social /
  copy-trading. Concentrating losses by copying a loud user is the
  opposite of what this tool is for. (3) No options pricing or
  Greeks. Out of scope, and there are better dedicated tools.
- *Follow-ups:* Even if a user asks for it? How do you say no
  gracefully?

---

*One-liner if asked to summarize the project in code terms:*
**Monorepo of an Expo client and a Node backend, both TypeScript, talking
to Postgres and OpenAI, shipped freemium with server-enforced quotas and a
white-glove tactile UI.**
