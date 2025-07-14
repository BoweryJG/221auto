# HomeFlow

An iconic music-driven home automation platform that seamlessly integrates SwitchBot, Yale locks, Sonos speakers, Spotify, and Hype Machine.

## Features

- **Music-Aware Automation**: Scenes that adapt to your music mood and tempo
- **Unified Music Experience**: Seamlessly blend Spotify and Hype Machine
- **Intelligent Presence Detection**: Welcome home with personalized music
- **Gesture Control**: Use SwitchBot for intuitive music and scene control
- **Superior Sonos Control**: Better UX than the native Sonos app

## Tech Stack

- Backend: Node.js, Express, WebSocket
- Frontend: React Native (mobile), React (web)
- Database: PostgreSQL, Redis
- APIs: SwitchBot, Yale Access, Sonos, Spotify, Hype Machine

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and add your API keys

3. Run the development server:
```bash
npm run dev
```

## Architecture

- `/server` - Node.js backend services
- `/mobile` - React Native app
- `/web` - React web dashboard
- `/shared` - Shared utilities and types