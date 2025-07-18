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
    const segments = analysis.analysis?.processed?.energyProfile || [];
    
    // Advanced mood detection using multiple factors
    const moods = [];
    
    // Basic audio features analysis
    if (features.energy > 0.8 && features.valence > 0.7) {
      moods.push({ mood: 'party', confidence: 0.9 });
    }
    
    if (features.energy < 0.3 && features.valence < 0.4) {
      moods.push({ mood: 'chill', confidence: 0.8 });
    }
    
    if (features.energy > 0.6 && features.valence < 0.4) {
      moods.push({ mood: 'intense', confidence: 0.7 });
    }
    
    if (features.acousticness > 0.7) {
      moods.push({ mood: 'acoustic', confidence: 0.8 });
    }
    
    if (features.danceability > 0.7) {
      moods.push({ mood: 'dance', confidence: 0.7 });
    }
    
    // Advanced analysis using pitch and timbre if available
    if (segments.length > 0) {
      const advancedMood = this.analyzeAdvancedMood(segments, features);
      if (advancedMood) {
        moods.push(advancedMood);
      }
    }
    
    // Temporal analysis for dynamic moods
    if (analysis.analysis?.processed?.sectionMap) {
      const temporalMood = this.analyzeTemporalMood(analysis.analysis.processed.sectionMap);
      if (temporalMood) {
        moods.push(temporalMood);
      }
    }
    
    // Return the mood with highest confidence, or 'neutral' if no strong mood detected
    if (moods.length === 0) {
      return 'neutral';
    }
    
    const bestMood = moods.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
    
    return bestMood.mood;
  }

  analyzeAdvancedMood(segments, features) {
    // Analyze pitch and timbre patterns
    const avgPitchVariation = this.calculatePitchVariation(segments);
    const timbreComplexity = this.calculateTimbreComplexity(segments);
    const energyVariation = this.calculateEnergyVariation(segments);
    
    // Dark/moody detection using pitch analysis
    if (avgPitchVariation.dominantPitches.includes(0, 1, 2) && features.valence < 0.3) {
      return { mood: 'dark', confidence: 0.8 };
    }
    
    // Bright/uplifting detection
    if (avgPitchVariation.dominantPitches.includes(4, 7, 11) && features.valence > 0.6) {
      return { mood: 'bright', confidence: 0.7 };
    }
    
    // Experimental/complex detection
    if (timbreComplexity > 0.8 && energyVariation > 0.7) {
      return { mood: 'experimental', confidence: 0.6 };
    }
    
    // Dreamy/ambient detection
    if (timbreComplexity < 0.3 && energyVariation < 0.4 && features.instrumentalness > 0.7) {
      return { mood: 'dreamy', confidence: 0.7 };
    }
    
    return null;
  }

  analyzeTemporalMood(sectionMap) {
    // Analyze how mood changes throughout the song
    const sectionTypes = sectionMap.map(section => section.type);
    const dynamicChanges = this.calculateDynamicChanges(sectionMap);
    
    // High dynamic range suggests emotional/epic music
    if (dynamicChanges.loudnessRange > 20 && sectionTypes.includes('chorus')) {
      return { mood: 'epic', confidence: 0.6 };
    }
    
    // Consistent low energy suggests meditative music
    if (dynamicChanges.energyVariation < 0.2 && sectionMap.every(s => s.loudness < -10)) {
      return { mood: 'meditative', confidence: 0.7 };
    }
    
    return null;
  }

  calculatePitchVariation(segments) {
    const allPitches = segments.flatMap(seg => seg.pitches || []);
    const pitchCounts = new Array(12).fill(0);
    
    segments.forEach(segment => {
      if (segment.pitches) {
        segment.pitches.forEach((pitch, index) => {
          pitchCounts[index] += pitch;
        });
      }
    });
    
    const dominantPitches = pitchCounts
      .map((count, index) => ({ pitch: index, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(p => p.pitch);
    
    return {
      dominantPitches,
      variation: this.calculateVariance(pitchCounts)
    };
  }

  calculateTimbreComplexity(segments) {
    const timbreVariations = segments.map(segment => {
      if (!segment.timbre || segment.timbre.length === 0) return 0;
      return this.calculateVariance(segment.timbre);
    });
    
    return timbreVariations.reduce((sum, variation) => sum + variation, 0) / timbreVariations.length;
  }

  calculateEnergyVariation(segments) {
    const energyLevels = segments.map(seg => seg.energy || 0);
    return this.calculateVariance(energyLevels);
  }

  calculateDynamicChanges(sectionMap) {
    const loudnessLevels = sectionMap.map(section => section.loudness || 0);
    const minLoudness = Math.min(...loudnessLevels);
    const maxLoudness = Math.max(...loudnessLevels);
    
    return {
      loudnessRange: maxLoudness - minLoudness,
      energyVariation: this.calculateVariance(loudnessLevels)
    };
  }

  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
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