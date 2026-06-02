# TradeCoach — Mobile App

Expo / React Native app for Indian retail traders: connect Zerodha Kite, get
your trades auto-synced into round trips, journal what you felt and why, and
have an AI coach surface the patterns you can't see yourself.

> The backend lives in the sibling repo `../tradecoach-server`. The mobile app
> never talks to OpenAI / Kite directly — every secret stays server-side.

## What's inside

- **Kite Connect OAuth** — sign in once, sessions auto-refresh at 6 AM IST
- **Auto-sync** — fills → FIFO round trips (equity + F&O) the moment you open the app
- **Journal** — tag emotion, setup, and notes; AI can draft for you (Pro)
- **Pre-trade gate** — sanity-check a setup before you click buy (Pro)
- **Wellness** — mood check-ins, loss-recovery flow, streaks
- **Insights** — equity curve, hour-of-day heatmap, weekday breakdown, brokerage drag
- **Coach chat** — talk to a coach that has read every journal entry (Pro)
- **Tax + CSV export** — full F&O turnover and round-trip exports
- **Freemium** — free tier covers data + analytics; Pro unlocks AI surfaces

## Project layout

```
TradeCoach/
├── App.tsx                       # Providers + ErrorBoundary + router
├── app.json                      # Expo / native config
├── eas.json                      # EAS Build profiles (dev / preview / production)
├── src/
│   ├── api/                      # Per-domain HTTP clients
│   │   ├── http.ts               # Shared request helper + ApiError
│   │   ├── auth.ts trades.ts coach.ts gate.ts
│   │   ├── wellness.ts voice.ts subscription.ts legal.ts
│   │   └── index.ts              # Barrel — `import { … } from '../api'`
│   ├── auth/
│   │   ├── AuthProvider.tsx      # Context: user, entitlement, aiPro
│   │   ├── redirect.ts           # OAuth deep-link / web-redirect plumbing
│   │   └── session.ts            # SecureStore-backed token storage
│   ├── components/               # Reusable UI primitives (WalletCard, Glass, …)
│   ├── hooks/                    # React Query hooks (useTrades, useCoach, …)
│   ├── navigation/               # Tabs + RootNavigator + navTheme
│   ├── screens/                  # One screen per file
│   ├── store/                    # Zustand (chat history; trades live on server)
│   ├── types/                    # Shared TS contracts mirroring server DTOs
│   └── utils/                    # theme, currency, market-hours helpers
```

## Quick start (local)

### 1. Start the backend

```bash
cd ../tradecoach-server
cp .env.example .env       # fill DATABASE_URL, KITE_*, SESSION_JWT_SECRET, OPENAI_API_KEY
npm install
npm run db:push
npm run dev                # http://localhost:4000
```

Register the redirect URL in the Kite developer console:
`{PUBLIC_BASE_URL}/auth/kite/callback`.

### 2. Start the mobile app

```bash
cp .env.example .env
# Simulator → leave EXPO_PUBLIC_API_URL=http://localhost:4000
# Real phone on Wi-Fi → http://<your-mac-LAN-IP>:4000
npm install
npm start
```

- Press `i` for iOS Simulator (requires Xcode) or `a` for Android Emulator.
- Press `w` for web (most flows work; native-only screens degrade gracefully).
- For a real device, build a development client with EAS — Expo Go isn't
  pinned to SDK 56.

### 3. First login

1. Tap **Connect with Zerodha Kite**
2. Sign in on `kite.zerodha.com`
3. You're returned to the app with `tradecoach://auth/complete?token=…`
4. Tap **Sync** on Today after trading hours

Kite tokens expire daily at 6 AM IST — the app prompts you to reconnect.

## Builds

| Profile     | Channel             | API URL                                   |
| ----------- | ------------------- | ----------------------------------------- |
| development | local dev client    | `http://localhost:4000`                   |
| preview     | internal APK / TestFlight | `https://tradecoach-api.onrender.com` |
| production  | Play Store AAB / App Store | `https://tradecoach-api.onrender.com` |

```bash
eas build --profile preview --platform android
eas build --profile production --platform android
```

iOS builds require an Apple Developer Program membership ($99/yr) and a
provisioning profile — Android-only is the default until you onboard.

## Scripts

```bash
npm start          # Metro bundler
npm run android    # open in Android emulator
npm run ios        # open in iOS simulator
npm run web        # open in browser
npm run typecheck  # tsc --noEmit
```

## Architecture notes

- **AI runs server-side only.** The app calls `tradecoach-server` for every LLM
  surface so the OpenAI key never ships in a bundle. If the server has no key
  set, the app drops into "Lite mode" and hides AI-only UI automatically.
- **Auth context is the single source of truth** for `user`, `entitlement`, and
  the derived `aiPro` flag. Every Pro-gated surface reads `aiPro` to decide
  whether to render itself or fall back to a paywall.
- **React Query owns network state.** Hooks under `src/hooks/` map 1:1 to API
  endpoints and expose typed query/mutation results. Screens never call
  `fetch` directly.
- **Crash safety**: a top-level `ErrorBoundary` catches render-tree throws and
  shows a recoverable fallback instead of a white screen.

## License

MIT
