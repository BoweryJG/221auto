require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Import music services
const unifiedMusicService = require('./services/unifiedMusic');
const sonosService = require('./services/sonos');
const beatTracker = require('./services/beatTracker');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

app.set('trust proxy', 1); // Trust first proxy for Render
app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api', limiter);

const wss = new WebSocket.Server({ 
  server,
  path: '/ws'
});

// Broadcast function to send data to all connected clients
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Connect music service events to WebSocket broadcasts
unifiedMusicService.on('nowPlayingChanged', (track) => {
  broadcast({
    type: 'nowPlaying',
    track: {
      title: track.title,
      artist: track.artist,
      source: track.source,
      mood: track.mood,
      albumArt: track.albumArt
    }
  });
});

unifiedMusicService.on('moodChanged', (mood) => {
  broadcast({
    type: 'musicAnalysis',
    mood: mood,
    timestamp: Date.now()
  });
});

unifiedMusicService.on('queueUpdated', (queue) => {
  broadcast({
    type: 'queueUpdated',
    queue: queue.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      source: track.source
    }))
  });
});

// Beat tracker events
beatTracker.on('trackingStarted', (data) => {
  broadcast({
    type: 'trackingStarted',
    track: data.track,
    totalBeats: data.totalBeats,
    totalSections: data.totalSections,
    timestamp: Date.now()
  });
});

beatTracker.on('beat', (data) => {
  broadcast({
    type: 'beat',
    beat: {
      index: data.index,
      progress: data.progress,
      timeRemaining: data.timeRemaining,
      isDownbeat: data.isDownbeat,
      measurePosition: data.measurePosition
    },
    timestamp: Date.now()
  });
});

beatTracker.on('downbeat', (data) => {
  broadcast({
    type: 'downbeat',
    measure: data.measure,
    progress: data.progress,
    timestamp: Date.now()
  });
});

beatTracker.on('sectionChange', (data) => {
  broadcast({
    type: 'sectionChange',
    section: {
      index: data.index,
      type: data.processed?.type || 'unknown',
      progress: data.progress,
      sectionProgress: data.sectionProgress
    },
    timestamp: Date.now()
  });
});

// Section-specific events
['intro', 'verse', 'chorus', 'bridge', 'outro'].forEach(sectionType => {
  beatTracker.on(`section:${sectionType}`, (data) => {
    broadcast({
      type: 'sectionEvent',
      sectionType,
      section: data.processed,
      timestamp: Date.now()
    });
  });
});

beatTracker.on('trackingStopped', () => {
  broadcast({
    type: 'trackingStopped',
    timestamp: Date.now()
  });
});

wss.on('connection', (ws) => {
  logger.info('New WebSocket connection established');
  
  // Send current state to new connections
  const nowPlaying = unifiedMusicService.getNowPlaying();
  if (nowPlaying) {
    ws.send(JSON.stringify({
      type: 'nowPlaying',
      track: nowPlaying
    }));
  }
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      logger.info('Received message:', data);
      
      // Handle beat tracking commands
      if (data.type === 'startBeatTracking') {
        try {
          const { track, analysis } = data;
          beatTracker.startTracking(track, analysis);
          ws.send(JSON.stringify({
            type: 'beatTrackingStarted',
            status: 'success',
            track: track
          }));
        } catch (error) {
          logger.error('Beat tracking error:', error);
          ws.send(JSON.stringify({
            type: 'beatTrackingError',
            error: error.message
          }));
        }
      }
      
      if (data.type === 'stopBeatTracking') {
        beatTracker.stopTracking();
        ws.send(JSON.stringify({
          type: 'beatTrackingStopped',
          status: 'success'
        }));
      }
      
      if (data.type === 'pauseBeatTracking') {
        beatTracker.pause();
        ws.send(JSON.stringify({
          type: 'beatTrackingPaused',
          status: 'success'
        }));
      }
      
      if (data.type === 'resumeBeatTracking') {
        beatTracker.resume();
        ws.send(JSON.stringify({
          type: 'beatTrackingResumed',
          status: 'success'
        }));
      }
      
      if (data.type === 'seekBeatTracking') {
        const { position } = data;
        beatTracker.seek(position);
        ws.send(JSON.stringify({
          type: 'beatTrackingSeeked',
          status: 'success',
          position: position
        }));
      }
      
      if (data.type === 'getBeatTrackingState') {
        const state = beatTracker.getCurrentState();
        ws.send(JSON.stringify({
          type: 'beatTrackingState',
          state: state
        }));
      }

      // Handle music control commands
      if (data.type === 'musicControl') {
        const { action, volume } = data;
        
        try {
          // Get access token and first available group
          const accessToken = process.env.SONOS_ACCESS_TOKEN;
          if (!accessToken) {
            logger.error('Sonos not authenticated - no access token found');
            broadcast({
              type: 'musicControl',
              action: action,
              status: 'error',
              error: 'Sonos not authenticated - please connect Sonos first'
            });
            return;
          }

          // Get households and groups to find first available group
          const households = await sonosService.getHouseholds(accessToken);
          if (!households.length) {
            throw new Error('No Sonos households found');
          }

          const groups = await sonosService.getGroups(accessToken, households[0].id);
          if (!groups.length) {
            throw new Error('No Sonos groups found');
          }

          const groupId = groups[0].id;

          switch(action) {
            case 'playPause':
              // Check current playback state and toggle
              logger.info('Play/Pause command received');
              // For now, assume play - in production, check current state first
              await sonosService.play(accessToken, groupId);
              broadcast({
                type: 'musicControl',
                action: 'playPause',
                status: 'executed'
              });
              break;
              
            case 'next':
              logger.info('Next track command received');
              await sonosService.skipToNext(accessToken, groupId);
              broadcast({
                type: 'musicControl', 
                action: 'next',
                status: 'executed'
              });
              break;
              
            case 'previous':
              logger.info('Previous track command received');
              await sonosService.skipToPrevious(accessToken, groupId);
              broadcast({
                type: 'musicControl',
                action: 'previous', 
                status: 'executed'
              });
              break;
              
            case 'setVolume':
              logger.info('Volume command received:', volume);
              await sonosService.setVolume(accessToken, groupId, volume);
              broadcast({
                type: 'musicControl',
                action: 'setVolume',
                volume: volume,
                status: 'executed'
              });
              break;
              
            case 'startRadio':
              logger.info('Start radio command received');
              // Load a default radio station or playlist
              await sonosService.loadRadioStation(accessToken, groupId);
              broadcast({
                type: 'musicControl',
                action: 'startRadio',
                status: 'executed'
              });
              break;
          }
        } catch (error) {
          logger.error('Music control error:', error);
          
          // Provide more detailed error information
          let errorMessage = error.message;
          if (error.response) {
            errorMessage = `HTTP ${error.response.status}: ${error.response.data?.message || error.response.statusText}`;
          } else if (error.code === 'ECONNABORTED') {
            errorMessage = 'Request timeout - Sonos may be offline';
          } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Connection refused - Sonos API unavailable';
          }
          
          broadcast({
            type: 'musicControl',
            action: action,
            status: 'error',
            error: errorMessage
          });
        }
      }
    } catch (error) {
      logger.error('Invalid message format:', error);
    }
  });

  ws.on('close', () => {
    logger.info('WebSocket connection closed');
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    services: {
      sonos: {
        authenticated: !!process.env.SONOS_ACCESS_TOKEN,
        token: process.env.SONOS_ACCESS_TOKEN ? 'Present' : 'Missing'
      },
      spotify: {
        authenticated: !!process.env.SPOTIFY_ACCESS_TOKEN,
        token: process.env.SPOTIFY_ACCESS_TOKEN ? 'Present' : 'Missing'
      }
    },
    timestamp: new Date().toISOString()
  });
});

app.use('/api/devices', require('./api/devices'));
app.use('/api/music', require('./api/music'));
app.use('/api/automation', require('./api/automation'));
app.use('/api/auth', require('./api/auth'));
app.use('/api/webhooks', require('./api/webhooks'));

app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Important for Render

server.listen(PORT, HOST, () => {
  logger.info(`HomeFlow server running on port ${PORT}`);
  const wsUrl = process.env.NODE_ENV === 'production' 
    ? `wss://${process.env.RENDER_EXTERNAL_HOSTNAME}/ws`
    : `ws://localhost:${PORT}/ws`;
  logger.info(`WebSocket server available at ${wsUrl}`);
});