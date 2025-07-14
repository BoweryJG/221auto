const EventEmitter = require('events');
const spotifyService = require('./spotify');
const hypemService = require('./hypem');
const sonosService = require('./sonos');

class UnifiedMusicService extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.nowPlaying = null;
    this.currentSource = null;
    this.moodCache = new Map();
  }

  async getNowPlaying() {
    return this.nowPlaying;
  }

  async getQueue() {
    return this.queue;
  }

  async addToQueue(source, trackId) {
    const track = await this.getTrackDetails(source, trackId);
    
    this.queue.push({
      id: `${source}-${trackId}`,
      source,
      trackId,
      ...track,
      addedAt: new Date()
    });
    
    this.emit('queueUpdated', this.queue);
    return { success: true, position: this.queue.length };
  }

  async getTrackDetails(source, trackId) {
    if (source === 'spotify') {
      const track = await spotifyService.getTrack(trackId);
      return {
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        duration: track.duration_ms,
        albumArt: track.album.images[0]?.url
      };
    } else if (source === 'hypem') {
      const track = await hypemService.getTrackInfo(trackId);
      return {
        title: track.title,
        artist: track.artist,
        duration: track.duration * 1000,
        albumArt: track.thumb_url
      };
    }
  }

  async playNext() {
    if (this.queue.length === 0) return null;
    
    const nextTrack = this.queue.shift();
    this.nowPlaying = nextTrack;
    this.currentSource = nextTrack.source;
    
    await this.loadTrackToSonos(nextTrack);
    this.emit('nowPlayingChanged', this.nowPlaying);
    
    const mood = await this.analyzeTrackMood(nextTrack);
    this.emit('moodChanged', mood);
    
    return nextTrack;
  }

  async analyzeTrack(trackId, source) {
    const cacheKey = `${source}-${trackId}`;
    if (this.moodCache.has(cacheKey)) {
      return this.moodCache.get(cacheKey);
    }

    let analysis;
    
    if (source === 'spotify') {
      analysis = await spotifyService.getTrackAnalysis(trackId);
    } else {
      analysis = await this.estimateHypemTrackFeatures(trackId);
    }
    
    const mood = this.calculateMood(analysis);
    this.moodCache.set(cacheKey, { analysis, mood });
    
    return { analysis, mood };
  }

  calculateMood(analysis) {
    const { features } = analysis;
    
    if (features.energy > 0.8 && features.valence > 0.7) {
      return 'party';
    } else if (features.energy < 0.3 && features.valence < 0.4) {
      return 'chill';
    } else if (features.energy > 0.6 && features.valence < 0.4) {
      return 'intense';
    } else if (features.acousticness > 0.7) {
      return 'acoustic';
    } else if (features.danceability > 0.7) {
      return 'dance';
    } else {
      return 'neutral';
    }
  }

  async analyzeTrackMood(track) {
    const { mood } = await this.analyzeTrack(track.trackId, track.source);
    return mood;
  }

  async estimateHypemTrackFeatures(trackId) {
    const track = await hypemService.getTrackInfo(trackId);
    
    return {
      features: {
        energy: 0.5,
        valence: 0.5,
        danceability: 0.6,
        acousticness: 0.3,
        tempo: 120
      },
      analysis: {
        tempo: 120,
        key: 0,
        mode: 1,
        time_signature: 4,
        loudness: -10
      }
    };
  }

  async loadTrackToSonos(track) {
    if (track.source === 'spotify') {
      const spotifyUri = `spotify:track:${track.trackId}`;
      await sonosService.loadSpotifyUri(null, 'default-group', spotifyUri);
    } else if (track.source === 'hypem') {
      const streamUrl = await hypemService.getStreamUrl(track.trackId);
      await sonosService.loadStreamUrl(null, 'default-group', streamUrl);
    }
  }

  async createSmartPlaylist(mood, duration = 60) {
    const tracks = [];
    const targetDuration = duration * 60 * 1000;
    let currentDuration = 0;
    
    const spotifyTracks = await this.getSpotifyTracksByMood(mood);
    const hypemTracks = await this.getHypemTracksByMood(mood);
    
    const allTracks = [...spotifyTracks, ...hypemTracks];
    
    while (currentDuration < targetDuration && allTracks.length > 0) {
      const randomIndex = Math.floor(Math.random() * allTracks.length);
      const track = allTracks.splice(randomIndex, 1)[0];
      
      tracks.push(track);
      currentDuration += track.duration;
    }
    
    return tracks;
  }

  async getSpotifyTracksByMood(mood) {
    const moodSeeds = {
      party: { energy: 0.9, valence: 0.8, tempo: 128 },
      chill: { energy: 0.3, valence: 0.5, tempo: 90 },
      intense: { energy: 0.9, valence: 0.3, tempo: 140 },
      acoustic: { acousticness: 0.8, energy: 0.4, tempo: 100 },
      dance: { danceability: 0.8, energy: 0.7, tempo: 120 }
    };
    
    const seeds = moodSeeds[mood] || moodSeeds.neutral;
    const recommendations = await spotifyService.getRecommendations(null, [], seeds);
    
    return recommendations.map(track => ({
      source: 'spotify',
      trackId: track.id,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      duration: track.duration_ms,
      albumArt: track.album.images[0]?.url
    }));
  }

  async getHypemTracksByMood(mood) {
    const filter = mood === 'party' ? 'popular' : 'latest';
    const tracks = await hypemService.getPopular(filter);
    
    return tracks.slice(0, 10).map(track => ({
      source: 'hypem',
      trackId: track.itemid,
      title: track.title,
      artist: track.artist,
      duration: (track.duration || 180) * 1000,
      albumArt: track.thumb_url
    }));
  }
}

module.exports = new UnifiedMusicService();