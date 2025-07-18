const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const sonosService = require('../services/sonos');
const spotifyService = require('../services/spotify');
const hypemService = require('../services/hypem');

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

// Spotify OAuth routes
router.get('/spotify', async (req, res) => {
  try {
    // Check if we already have tokens in environment
    const existingAccessToken = process.env.SPOTIFY_ACCESS_TOKEN;
    const existingRefreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
    
    if (existingAccessToken && existingRefreshToken) {
      console.log('Using existing Spotify tokens from environment');
      res.redirect('https://221auto.netlify.app/?spotify=connected');
      return;
    }
    
    // No tokens found, initiate OAuth flow
    const authUrl = spotifyService.getAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/spotify/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    
    if (error) {
      return res.status(400).json({ error: `Spotify auth error: ${error}` });
    }
    
    if (!code) {
      return res.status(400).json({ error: 'No authorization code received' });
    }
    
    // Exchange code for tokens
    const tokenData = await spotifyService.exchangeCodeForToken(code);
    
    // For now, log the tokens - in production, store them securely
    console.log('Spotify tokens received:', {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in
    });
    
    // Store tokens temporarily in environment (in production, use database)
    process.env.SPOTIFY_ACCESS_TOKEN = tokenData.access_token;
    process.env.SPOTIFY_REFRESH_TOKEN = tokenData.refresh_token;
    
    // Redirect to success page
    res.redirect('https://221auto.netlify.app/?spotify=connected');
  } catch (error) {
    console.error('Spotify callback error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sonos OAuth routes
router.get('/sonos', async (req, res) => {
  try {
    // Check if we already have tokens in environment
    const existingAccessToken = process.env.SONOS_ACCESS_TOKEN;
    const existingRefreshToken = process.env.SONOS_REFRESH_TOKEN;
    
    if (existingAccessToken && existingRefreshToken) {
      console.log('Using existing Sonos tokens from environment');
      res.redirect('https://221auto.netlify.app/?sonos=connected');
      return;
    }
    
    // No tokens found, initiate OAuth flow
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
    res.redirect('https://221auto.netlify.app/?sonos=connected');
  } catch (error) {
    console.error('Sonos callback error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Hype Machine authentication routes
router.get('/hypem', async (req, res) => {
  try {
    // Use environment variables for credentials
    const hypemUsername = process.env.HYPEM_USERNAME;
    const hypemPassword = process.env.HYPEM_PASSWORD;
    
    if (!hypemUsername || !hypemPassword) {
      return res.status(400).json({ error: 'Hype Machine credentials not configured in environment' });
    }
    
    // Attempt login with Hype Machine using env credentials
    const loginResult = await hypemService.login(hypemUsername, hypemPassword);
    
    console.log('Hype Machine login successful for user:', hypemUsername);
    
    // Redirect to success page
    res.redirect('https://221auto.netlify.app/?hypem=connected');
  } catch (error) {
    console.error('Hype Machine login error:', error);
    res.redirect('https://221auto.netlify.app/?hypem=error');
  }
});

module.exports = router;