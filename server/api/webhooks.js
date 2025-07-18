const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const switchBotService = require('../services/switchbot');
const automationEngine = require('../services/automationEngine');

// SwitchBot webhook
router.post('/switchbot', (req, res) => {
  try {
    // Verify webhook signature if needed
    const signature = req.headers['x-switchbot-signature'];
    
    // Process the webhook event
    switchBotService.handleWebhookEvent(req.body);
    
    res.json({ success: true });
  } catch (error) {
    console.error('SwitchBot webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Gesture training endpoint
router.post('/gesture/train', async (req, res) => {
  try {
    const { deviceId, name, events } = req.body;
    const gestureController = require('../services/gestureController');
    
    const pattern = gestureController.trainPattern(deviceId, name, events);
    
    res.json({ 
      success: true, 
      pattern 
    });
  } catch (error) {
    console.error('Gesture training error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;