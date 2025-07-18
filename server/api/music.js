const express = require('express');
const router = express.Router();
const spotifyService = require('../services/spotify');
const hypemService = require('../services/hypem');
const unifiedMusicService = require('../services/unifiedMusic');

router.get('/now-playing', async (req, res) => {
  try {
    const nowPlaying = await unifiedMusicService.getNowPlaying();
    res.json(nowPlaying);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/queue', async (req, res) => {
  try {
    const queue = await unifiedMusicService.getQueue();
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/queue/add', async (req, res) => {
  try {
    const { source, trackId } = req.body;
    const result = await unifiedMusicService.addToQueue(source, trackId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/spotify/playlists', async (req, res) => {
  try {
    const playlists = await spotifyService.getUserPlaylists(req.user.spotifyToken);
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/hypem/favorites', async (req, res) => {
  try {
    const favorites = await hypemService.getFavorites(req.user.hypemToken);
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/analyze', async (req, res) => {
  try {
    const { trackId, source } = req.body;
    const analysis = await unifiedMusicService.analyzeTrack(trackId, source);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Missing endpoints that the frontend needs
router.get('/hypem/popular', async (req, res) => {
  try {
    const popular = await hypemService.getPopular();
    res.json({ tracks: popular });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/hypem/latest', async (req, res) => {
  try {
    const latest = await hypemService.getLatest();
    res.json({ tracks: latest });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const results = await unifiedMusicService.search(q);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/play', async (req, res) => {
  try {
    const { trackId, source } = req.body;
    const result = await unifiedMusicService.playTrack(trackId, source);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/toggle', async (req, res) => {
  try {
    const result = await unifiedMusicService.togglePlayPause();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/next', async (req, res) => {
  try {
    const result = await unifiedMusicService.nextTrack();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/previous', async (req, res) => {
  try {
    const result = await unifiedMusicService.previousTrack();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/queue/remove', async (req, res) => {
  try {
    const { index } = req.body;
    const result = await unifiedMusicService.removeFromQueue(index);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/spotify/playlist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const playlist = await spotifyService.getPlaylistTracks(id, req.user.spotifyToken);
    res.json({ tracks: playlist });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;