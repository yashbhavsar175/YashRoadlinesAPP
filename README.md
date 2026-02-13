This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# YashRoadlines Application

A comprehensive mobile application for managing transportation and logistics operations across multiple office locations.

## Features

### Multi-Office Support

The application supports multiple office locations with complete data segregation:

- **Office Management**: Create and manage multiple office locations (e.g., "Prem Darvaja Office", "Aslali Office")
- **User Assignment**: Assign users to specific offices during account creation
- **Data Segregation**: All transactions are automatically tagged with office location
- **Office Switching**: Admin users can switch between offices to view and manage data
- **Consolidated Reports**: Admin users can view aggregated data across all offices
- **Role-Based Access**: Regular users see only their assigned office data

**Key Benefits:**
- Manage multiple locations from a single application
- Complete data isolation between offices
- Flexible reporting for individual offices or consolidated view
- Seamless office switching for administrators

For detailed information, see:
- [Multi-Office User Guide](docs/MULTI_OFFICE_USER_GUIDE.md) - For regular users
- [Multi-Office Admin Guide](docs/MULTI_OFFICE_ADMIN_GUIDE.md) - For administrators
- [Database Schema Documentation](docs/MULTI_OFFICE_DATABASE_SCHEMA.md) - For developers
- [Code Reference](docs/MULTI_OFFICE_CODE_REFERENCE.md) - For developers

### Core Features

- **Transaction Management**: Agency payments, majuri entries, driver transactions, fuel entries
- **Daily Reports**: Generate daily transaction reports with office-specific filtering
- **Monthly Statements**: View monthly summaries with office breakdowns
- **User Access Management**: Role-based permissions and office assignments
- **Offline Sync**: Work offline and sync when connection is restored
- **PDF Export**: Generate PDF reports with office information

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Documentation

## User Guides

- [Multi-Office User Guide](docs/MULTI_OFFICE_USER_GUIDE.md) - Guide for regular users
- [Multi-Office Admin Guide](docs/MULTI_OFFICE_ADMIN_GUIDE.md) - Guide for administrators
- [Office Management User Guide](OFFICE_MANAGEMENT_USER_GUIDE.md) - Detailed office management workflows

## Technical Documentation

- [Database Schema Documentation](docs/MULTI_OFFICE_DATABASE_SCHEMA.md) - Database structure and migrations
- [Code Reference](docs/MULTI_OFFICE_CODE_REFERENCE.md) - Developer reference for multi-office features
- [Offline Sync Implementation](OFFLINE_SYNC_IMPLEMENTATION.md) - Offline functionality details
- [Performance Optimization Guide](PERFORMANCE_OPTIMIZATION_GUIDE.md) - Performance best practices

## Testing

- [Multi-Office Integration Test Guide](__tests__/MULTI_OFFICE_INTEGRATION_TEST_GUIDE.md) - Integration testing guide
- [Quick Test Reference](__tests__/QUICK_TEST_REFERENCE.md) - Quick testing reference

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
