const express = require('express');
const router = express.Router();
const switchBotService = require('../services/switchbot');
const sonosService = require('../services/sonos');
const hypemService = require('../services/hypem');

router.get('/', async (req, res) => {
  try {
    const devices = {};
    
    // Try each service individually to avoid complete failure
    try {
      devices.switchbot = await switchBotService.getDevices();
    } catch (error) {
      console.error('SwitchBot error:', error);
      devices.switchbot = { error: error.message };
    }
    
    
    try {
      // Check if Sonos is connected by checking environment tokens
      const sonosAccessToken = process.env.SONOS_ACCESS_TOKEN;
      if (sonosAccessToken) {
        try {
          const speakers = await sonosService.getSpeakers();
          devices.sonos = {
            connected: true,
            message: `Connected to Sonos (${speakers.length} speakers)`,
            speakers: speakers
          };
        } catch (error) {
          console.error('Sonos getSpeakers error:', error);
          console.error('Full error details:', error.response?.data || error);
          devices.sonos = {
            connected: true,
            message: `Connected but unable to get speakers: ${error.message}`,
            error: error.message,
            details: error.response?.data || null
          };
        }
      } else {
        devices.sonos = {
          connected: false,
          message: 'Not connected - click Connect Sonos button',
          speakers: []
        };
      }
    } catch (error) {
      console.error('Sonos error:', error);
      devices.sonos = { 
        error: error.message,
        connected: false,
        message: error.message.includes('not authenticated') 
          ? 'Please connect Sonos via the Connect Sonos button'
          : 'Connection failed - check credentials'
      };
    }
    
    // Check HypeM connection by checking environment credentials
    try {
      const hypemUsername = process.env.HYPEM_USERNAME;
      const hypemPassword = process.env.HYPEM_PASSWORD;
      
      if (hypemUsername && hypemPassword) {
        devices.hypem = {
          connected: true,
          message: 'Connected to Hype Machine',
          username: hypemUsername
        };
      } else {
        devices.hypem = {
          connected: false,
          message: 'Not connected - click Connect Hype Machine button'
        };
      }
    } catch (error) {
      console.error('HypeM error:', error);
      devices.hypem = { 
        error: error.message,
        connected: false,
        message: 'Connection failed'
      };
    }
    
    // Check Spotify connection
    try {
      const spotifyAccessToken = process.env.SPOTIFY_ACCESS_TOKEN;
      if (spotifyAccessToken) {
        devices.spotify = {
          connected: true,
          message: 'Connected to Spotify'
        };
      } else {
        devices.spotify = {
          connected: false,
          message: 'Not connected - click Connect Spotify button'
        };
      }
    } catch (error) {
      console.error('Spotify error:', error);
      devices.spotify = { 
        error: error.message,
        connected: false,
        message: 'Connection failed'
      };
    }
    
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/switchbot/:deviceId/command', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { command, parameter } = req.body;
    const result = await switchBotService.sendCommand(deviceId, command, parameter);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/sonos/:speakerId/control', async (req, res) => {
  try {
    const { speakerId } = req.params;
    const { action, value } = req.body;
    const result = await sonosService.controlSpeaker(speakerId, action, value);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint for Sonos API testing
router.get('/sonos/debug', async (req, res) => {
  try {
    const accessToken = process.env.SONOS_ACCESS_TOKEN;
    if (!accessToken) {
      return res.json({ error: 'No Sonos access token found' });
    }

    const axios = require('axios');
    const apiUrl = 'https://api.ws.sonos.com/control/api/v1';
    
    // Test households endpoint directly
    const response = await axios.get(`${apiUrl}/households`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    res.json({
      status: response.status,
      data: response.data,
      headers: response.headers
    });
  } catch (error) {
    res.json({
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers
    });
  }
});

module.exports = router;