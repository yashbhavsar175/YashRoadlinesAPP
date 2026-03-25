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

## Environment Variables

See `.env.example` for required variables.

## Security

- API keys stored in `.env` (not committed)
- Biometric authentication support
- Admin approval required for new user logins
