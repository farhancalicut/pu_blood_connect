# PU NSS Connect

A comprehensive blood donation management system built with React Native, Expo, and Firebase.

## Features

- Blood donation requests and management
- Event management and attendance tracking
- Hospital blood request system
- Blood bank directory
- User profiles and donation history
- QR code scanning for event verification
- Real-time notifications
- Certificate generation
- Admin dashboard

## Technology Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Deployment**: Vercel / Netlify
- **Cloud Storage**: Cloudinary

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
```

## Installation

```bash
npm install
```

## Development

```bash
# Start Expo development server
npm start

# Run on web
npm run web

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Production Build

```bash
# Build for web
npm run web:build

# Deploy to Firebase
npm run deploy:firebase
```

## License

Private - PU NSS Connect
