# HomeFlow Mobile App

React Native app for the HomeFlow music-driven home automation platform.

## Features

- 🎵 Now Playing display with mood indicators
- 🏠 Real-time device control (SwitchBot, Yale, Sonos)
- 🎭 Quick scene activation
- 🔄 WebSocket connection for live updates
- 🎨 Beautiful gradient UI

## Setup

1. Install dependencies:
```bash
cd mobile
npm install
```

2. iOS Setup:
```bash
cd ios
pod install
cd ..
```

3. Start Metro:
```bash
npm start
```

4. Run the app:

**iOS:**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

## Architecture

- `App.tsx` - Main app component with UI
- `src/services/api.ts` - API service for backend communication
- `src/components/` - Reusable components
- `src/screens/` - Screen components

## API Connection

The app connects to:
- Development: `http://localhost:3000`
- Production: Configure in `api.ts`

## Building for Production

**iOS:**
```bash
npx react-native run-ios --configuration Release
```

**Android:**
```bash
cd android
./gradlew assembleRelease
```