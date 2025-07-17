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

wss.on('connection', (ws) => {
  logger.info('New WebSocket connection established');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      logger.info('Received message:', data);
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