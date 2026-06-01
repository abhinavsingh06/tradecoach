# TradeCoach — AI Trading Journal & Coach

Expo app for Zerodha Kite traders: trades sync automatically from Kite, you tag
emotion/setup after the fact, and Claude coaches your psychology.

## Features

- **Kite login** — OAuth via Zerodha; no manual trade entry
- **Auto sync** — today's fills → FIFO round trips (equity + F&O)
- **Open positions** — unmatched legs on the dashboard
- **Journal** — tag setup, emotion, notes on closed round trips
- **AI Coach** — Claude reads your synced journal (API key in `.env` for now)
- **Insights** — P&L by emotion, setup, long vs short (₹)

## Prerequisites

1. **Kite Connect** app at [developers.kite.trade](https://developers.kite.trade)
2. **Backend** — sibling repo `../tradecoach-server` (Postgres + Node)
3. **Public HTTPS URL** for OAuth — ngrok locally, Render in prod

## Quick start

### 1. Backend

```bash
cd ../tradecoach-server
cp .env.example .env
# Fill DATABASE_URL (Neon), KITE_API_KEY, KITE_API_SECRET, SESSION_JWT_SECRET
# PUBLIC_BASE_URL = ngrok https URL when testing OAuth
npm install
npm run db:push
npm run dev
```

Register redirect URL in Kite console:

`{PUBLIC_BASE_URL}/auth/kite/callback`

### 2. Mobile app

```bash
cd TradeCoach
npm install
cp .env.example .env
# EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:4000  (not localhost on a real phone)
npm start
```

Press **w** for web, or use a **development build** on iOS (Expo Go on iPhone is
stuck on SDK 54; this project uses SDK 56).

### 3. First login

1. Tap **Connect with Zerodha Kite**
2. Sign in on kite.zerodha.com
3. App receives `tradecoach://auth/complete?token=...`
4. Tap **Sync** on Dashboard after trading

Kite sessions expire at **6 AM IST** daily — reconnect when prompted.

## Project structure

```
TradeCoach/
├── App.tsx                 # Auth gate + tabs + react-query
├── tradecoach-server/      # Sibling repo (not inside this folder)
├── src/
│   ├── api/client.ts       # Backend HTTP client
│   ├── auth/               # SecureStore session + Kite OAuth
│   ├── hooks/              # useTrades, useCoach
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── TradeDetailScreen.tsx  # Post-hoc journal tagging
│   │   └── ...
│   └── store/tradeStore.ts # Chat messages only (trades live on server)
```

## License

MIT
