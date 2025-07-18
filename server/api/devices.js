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
      // Check if Sonos is connected first
      if (sonosService.isConnected && sonosService.isConnected()) {
        devices.sonos = await sonosService.getSpeakers();
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
    
    // Check HypeM connection
    try {
      if (hypemService.isConnected && hypemService.isConnected()) {
        devices.hypem = {
          connected: true,
          message: 'Connected to Hype Machine',
          username: process.env.HYPEM_USERNAME || 'Unknown'
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

module.exports = router;