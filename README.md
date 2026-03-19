# YashRoadlines App

A React Native mobile application for managing transport and logistics business operations.

## Features

- Multi-office management
- Financial entries (Agency, Majuri, Fuel, General)
- Driver management and statements
- Mumbai delivery tracking
- E-Way bill management
- Real-time push notifications (FCM)
- Admin approval system for user login
- Biometric authentication
- Offline support with sync

## Tech Stack

- React Native CLI (TypeScript)
- Supabase (Backend & Realtime)
- Firebase Cloud Messaging (Push Notifications)
- React Navigation
- AsyncStorage

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in values
3. Run: `npm install`
4. Run: `npx react-native run-android`

## Development Scripts

- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm start` - Start Metro bundler
- `npm run reset` - Start Metro with cache reset
- `npm run clean` - Clean Android build
- `npm run build:release` - Build Android release APK
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run type-check` - TypeScript type checking

## Supabase CLI

The `supabase` package in devDependencies is a CLI-only tool for database migrations and local development. It's not bundled with the app. Use it with:

```bash
npx supabase [command]
```

## Environment Variables

See `.env.example` for required variables.

## Security

- API keys stored in `.env` (not committed)
- Biometric authentication support
- Admin approval required for new user logins
