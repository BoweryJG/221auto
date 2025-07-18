const SpotifyWebApi = require('spotify-web-api-node');

class SpotifyService {
  constructor() {
    this.spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI?.trim()
    });
    
    // Validate required environment variables
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      console.error('Spotify credentials not configured in environment');
    }
  }

  getAuthUrl() {
    const scopes = [
      'user-read-currently-playing',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-private',
      'playlist-read-private',
      'playlist-modify-private'
    ];
    
    return this.spotifyApi.createAuthorizeURL(scopes);
  }

  async exchangeCodeForToken(code) {
    try {
      const data = await this.spotifyApi.authorizationCodeGrant(code);
      return {
        access_token: data.body.access_token,
        refresh_token: data.body.refresh_token,
        expires_in: data.body.expires_in
      };
    } catch (error) {
      console.error('Spotify token exchange error:', error);
      throw error;
    }
  }

  async getUserPlaylists(accessToken) {
    this.spotifyApi.setAccessToken(accessToken);
    
    try {
      const data = await this.spotifyApi.getUserPlaylists();
      return data.body.items;
    } catch (error) {
      console.error('Spotify API error:', error);
      throw error;
    }
  }

  async getCurrentlyPlaying(accessToken) {
    this.spotifyApi.setAccessToken(accessToken);
    
    try {
      const data = await this.spotifyApi.getMyCurrentPlayingTrack();
      return data.body;
    } catch (error) {
      console.error('Spotify API error:', error);
      return null;
    }
  }

  async getTrackAnalysis(accessToken, trackId) {
    this.spotifyApi.setAccessToken(accessToken);
    
    try {
      const [features, analysis] = await Promise.all([
        this.spotifyApi.getAudioFeaturesForTrack(trackId),
        this.spotifyApi.getAudioAnalysisForTrack(trackId)
      ]);
      
      const fullAnalysis = analysis.body;
      
      return {
        features: features.body,
        analysis: {
          // Basic track info
          tempo: fullAnalysis.track.tempo,
          key: fullAnalysis.track.key,
          mode: fullAnalysis.track.mode,
          time_signature: fullAnalysis.track.time_signature,
          loudness: fullAnalysis.track.loudness,
          duration: fullAnalysis.track.duration,
          
          // Detailed timing structures
          bars: fullAnalysis.bars || [],
          beats: fullAnalysis.beats || [],
          tatums: fullAnalysis.tatums || [],
          sections: fullAnalysis.sections || [],
          segments: fullAnalysis.segments || [],
          
          // Track metadata
          meta: fullAnalysis.meta || {},
          
          // Processed data for easier use
          processed: {
            totalBeats: fullAnalysis.beats?.length || 0,
            totalSections: fullAnalysis.sections?.length || 0,
            avgBeatDuration: this.calculateAvgBeatDuration(fullAnalysis.beats || []),
            sectionMap: this.mapSections(fullAnalysis.sections || []),
            beatMap: this.createBeatMap(fullAnalysis.beats || []),
            energyProfile: this.createEnergyProfile(fullAnalysis.segments || [])
          }
        }
      };
    } catch (error) {
      console.error('Spotify analysis error:', error);
      throw error;
    }
  }

  calculateAvgBeatDuration(beats) {
    if (beats.length < 2) return 0;
    const totalDuration = beats.reduce((sum, beat) => sum + beat.duration, 0);
    return totalDuration / beats.length;
  }

  mapSections(sections) {
    return sections.map((section, index) => ({
      index,
      start: section.start,
      duration: section.duration,
      confidence: section.confidence,
      loudness: section.loudness,
      tempo: section.tempo,
      key: section.key,
      mode: section.mode,
      time_signature: section.time_signature,
      // Classify section type based on characteristics
      type: this.classifySection(section, index, sections.length)
    }));
  }

  classifySection(section, index, totalSections) {
    // Simple heuristic to classify sections
    if (index === 0) return 'intro';
    if (index === totalSections - 1) return 'outro';
    if (section.loudness > -5) return 'chorus';
    if (section.tempo < 0.5) return 'bridge';
    return 'verse';
  }

  createBeatMap(beats) {
    return beats.map((beat, index) => ({
      index,
      start: beat.start,
      duration: beat.duration,
      confidence: beat.confidence,
      // Add timing helpers
      nextBeat: index < beats.length - 1 ? beats[index + 1].start : null,
      isDownbeat: index % 4 === 0, // Assume 4/4 time
      measurePosition: index % 4
    }));
  }

  createEnergyProfile(segments) {
    return segments.map(segment => ({
      start: segment.start,
      duration: segment.duration,
      loudness_start: segment.loudness_start,
      loudness_max: segment.loudness_max,
      loudness_end: segment.loudness_end,
      // Calculate energy level (0-1)
      energy: Math.min(1, Math.max(0, (segment.loudness_max + 60) / 60)),
      // Pitch analysis
      pitches: segment.pitches || [],
      timbre: segment.timbre || [],
      // Dominant pitch
      dominantPitch: segment.pitches ? segment.pitches.indexOf(Math.max(...segment.pitches)) : 0
    }));
  }

  async searchTracks(accessToken, query, limit = 20) {
    this.spotifyApi.setAccessToken(accessToken);
    
    try {
      const data = await this.spotifyApi.searchTracks(query, { limit });
      return data.body.tracks.items;
    } catch (error) {
      console.error('Spotify search error:', error);
      throw error;
    }
  }

  async addToQueue(accessToken, trackUri) {
    this.spotifyApi.setAccessToken(accessToken);
    
    try {
      await this.spotifyApi.addToQueue(trackUri);
      return { success: true };
    } catch (error) {
      console.error('Spotify queue error:', error);
      throw error;
    }
  }

  async createPlaylist(accessToken, name, description) {
    this.spotifyApi.setAccessToken(accessToken);
    
    try {
      const data = await this.spotifyApi.createPlaylist(name, {
        description,
        public: false
      });
      return data.body;
    } catch (error) {
      console.error('Spotify playlist error:', error);
      throw error;
    }
  }

  async getRecommendations(accessToken, seedTracks, audioFeatures) {
    this.spotifyApi.setAccessToken(accessToken);
    
    try {
      const params = {
        seed_tracks: seedTracks.slice(0, 5).join(','),
        target_energy: audioFeatures.energy,
        target_valence: audioFeatures.valence,
        target_tempo: audioFeatures.tempo
      };
      
      const data = await this.spotifyApi.getRecommendations(params);
      return data.body.tracks;
    } catch (error) {
      console.error('Spotify recommendations error:', error);
      throw error;
    }
  }
}

module.exports = new SpotifyService();