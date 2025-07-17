const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const sonosService = require('../services/sonos');

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = {
      id: Date.now().toString(),
      email,
      password: hashedPassword
    };
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    res.json({ token, userId: user.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const token = jwt.sign({ userId: '123' }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/spotify/callback', async (req, res) => {
  try {
    res.redirect('/dashboard?spotify=connected');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sonos OAuth routes
router.get('/sonos', (req, res) => {
  try {
    const authUrl = sonosService.getAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sonos/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      return res.status(400).json({ error: `Sonos auth error: ${error}` });
    }
    
    if (!code) {
      return res.status(400).json({ error: 'No authorization code received' });
    }
    
    // Exchange code for tokens
    const tokenData = await sonosService.exchangeCodeForToken(code);
    
    // For now, log the tokens - in production, store them securely
    console.log('Sonos tokens received:', {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in
    });
    
    // Store tokens temporarily in environment (in production, use database)
    process.env.SONOS_ACCESS_TOKEN = tokenData.access_token;
    process.env.SONOS_REFRESH_TOKEN = tokenData.refresh_token;
    
    // Redirect to success page
    res.redirect('/dashboard?sonos=connected');
  } catch (error) {
    console.error('Sonos callback error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;