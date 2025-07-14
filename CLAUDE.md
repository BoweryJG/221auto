# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HomeFlow is a music-driven home automation platform that integrates SwitchBot, Yale locks, Sonos speakers, Spotify, and Hype Machine. The system creates intelligent automations based on music mood and tempo.

## Architecture

### Components
- **Backend API** (`/server`) - Node.js/Express with WebSocket support
- **Web Frontend** (`/web`) - Static site with music visualizer, deployed to Netlify
- **Mobile App** (`/mobile`) - React Native app for iOS/Android

### Key Services
- `switchbot.js` - Controls smart switches with gesture recognition
- `yale.js` - Smart lock control and presence detection
- `sonos.js` - Speaker control with better UX than native app
- `spotify.js` - Music streaming integration
- `hypem.js` - Hype Machine music discovery (uses web scraping)
- `unifiedMusic.js` - Combines Spotify/Hype Machine, analyzes mood
- `automationEngine.js` - Rule engine for music-aware automations
- `gestureController.js` - Pattern recognition for switch controls

## Commands

### Backend Development
```bash
npm install        # Install dependencies
npm run dev       # Start with nodemon (auto-restart)
npm start         # Production start
npm run lint      # Run ESLint
npm run typecheck # TypeScript checking
```

### Mobile Development
```bash
cd mobile
npm install
# iOS
cd ios && pod install && cd ..
npm run ios
# Android
npm run android
# Start Metro bundler separately
npm start
```

### Deployment
```bash
# Deploy web frontend to Netlify
netlify deploy --dir=web --prod

# Backend auto-deploys to Render on git push
git push origin main
```

## Environment Configuration

Create `.env` from `.env.example` with:
- Device APIs: SWITCHBOT_TOKEN, YALE_ACCESS_TOKEN, SONOS_CLIENT_ID
- Music: SPOTIFY_CLIENT_ID, HYPEM_USERNAME
- Database: DATABASE_URL (PostgreSQL), REDIS_URL
- Security: JWT_SECRET, ENCRYPTION_KEY

## API Endpoints

### Core APIs
- `GET /health` - Server status check
- `GET /api/devices` - List all connected devices
- `POST /api/devices/:deviceId/control` - Control specific device
- `GET /api/music/now-playing` - Current track info
- `POST /api/music/queue/add` - Add track to queue
- `POST /api/automation/rules` - Create automation rule
- `POST /api/automation/scenes/:id/activate` - Activate scene

### WebSocket Events
- `nowPlaying` - Track changes
- `musicAnalysis` - Mood/tempo data
- `deviceStatus` - Device state changes
- `beat` - Beat detection events

## Music Mood Analysis

The system analyzes tracks to determine mood:
- **party**: High energy (>0.8) + High valence (>0.7)
- **chill**: Low energy (<0.3) + Low valence (<0.4)
- **intense**: High energy (>0.6) + Low valence (<0.4)
- **acoustic**: High acousticness (>0.7)
- **dance**: High danceability (>0.7)

## Gesture Patterns

SwitchBot gesture controls:
- Double-tap: Next track
- Triple-tap: Previous track
- Long press: Play/pause
- Morse 'M': Morning scene
- Morse 'P': Party scene
- Morse 'S': Sleep scene

## Production URLs

- Frontend: https://221auto.netlify.app
- Visualizer: https://221auto.netlify.app/visualizer/
- Backend: https://homeflow-backend.onrender.com
- WebSocket: wss://homeflow-backend.onrender.com/ws

## Important Notes

- The mobile app requires `react-native-linear-gradient` which needs native linking
- Hype Machine integration uses unofficial web scraping (may break)
- Backend binds to `0.0.0.0` for Render deployment
- Frontend automatically switches between local/production APIs based on hostname
- Gesture patterns are stored in `gestureController.js` and can be customized