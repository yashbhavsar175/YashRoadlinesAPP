# Yash Roadlines App

A React Native mobile app for managing transport/logistics operations for Yash Roadlines. Handles delivery entries, agency payments, driver management, and real-time admin notifications.

## Tech Stack

- React Native 0.81 + TypeScript
- Supabase (PostgreSQL, Realtime, Auth)
- Firebase Cloud Messaging (FCM) — push notifications
- react-native-config — environment variable management
- react-navigation — screen navigation
- react-native-push-notification — local notifications

## Prerequisites

- Node.js >= 20
- React Native CLI environment set up ([guide](https://reactnative.dev/docs/environment-setup))
- Android Studio (for Android builds)
- Java 17+

## Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/yashbhavsar175/YashRoadlinesAPP.git
cd YashRoadlinesAPP/MyApp
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your real values (see Environment Variables section below).

### 3. Add Firebase config

Download `google-services.json` from Firebase Console and place it at:
```
android/app/google-services.json
```
This file is gitignored — never commit it.

### 4. Run on Android

```bash
npm run android
```

Or start Metro separately:
```bash
npm start
# then in another terminal:
npm run android
```

### 5. Run on iOS

```bash
cd ios && pod install && cd ..
npm run ios
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `GOOGLE_API_KEY` | Google API key (Maps, etc.) |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `FIREBASE_APP_ID` | Firebase Android app ID |
| `FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |

All values are loaded via `react-native-config` — never hardcode them in source files.

## Project Structure

```
src/
  screens/      # All app screens
  services/     # Supabase, FCM, notification services
  navigation/   # React Navigation setup
  components/   # Shared UI components
  context/      # React context providers
  utils/        # Helper functions
  types/        # TypeScript type definitions
  config/       # App configuration
```

## Security

- All secrets are in `.env` (gitignored)
- Firebase credentials stored as `firebase-credentials.json` (gitignored)
- Secret scanning runs on every push via GitHub Actions (TruffleHog + Gitleaks)
- See `CHANGELOG.md` for security incident history and remediations

## Running Tests

```bash
npm test
```

## Linting

```bash
npm run lint
```
