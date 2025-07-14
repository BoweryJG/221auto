const express = require('express');
const router = express.Router();
const switchBotService = require('../services/switchbot');
const yaleService = require('../services/yale');
const sonosService = require('../services/sonos');

router.get('/', async (req, res) => {
  try {
    const devices = {
      switchbot: await switchBotService.getDevices(),
      yale: await yaleService.getLocks(),
      sonos: await sonosService.getSpeakers()
    };
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

router.post('/yale/:lockId/control', async (req, res) => {
  try {
    const { lockId } = req.params;
    const { action } = req.body;
    const result = await yaleService.controlLock(lockId, action);
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