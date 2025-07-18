const SpotifyWebApi = require('spotify-web-api-node');

class SpotifyService {
  constructor() {
    this.spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI
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
      
      return {
        features: features.body,
        analysis: {
          tempo: analysis.body.track.tempo,
          key: analysis.body.track.key,
          mode: analysis.body.track.mode,
          time_signature: analysis.body.track.time_signature,
          loudness: analysis.body.track.loudness
        }
      };
    } catch (error) {
      console.error('Spotify analysis error:', error);
      throw error;
    }
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