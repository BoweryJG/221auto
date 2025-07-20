const fs = require('fs').promises;
const path = require('path');

class TokenManager {
  constructor() {
    this.storageDir = path.join(__dirname);
    this.spotifyTokenFile = path.join(this.storageDir, 'spotify-tokens.json');
    this.sonosTokenFile = path.join(this.storageDir, 'sonos-tokens.json');
  }

  async saveSpotifyTokens(tokens) {
    try {
      await fs.writeFile(this.spotifyTokenFile, JSON.stringify(tokens, null, 2));
      console.log('Spotify tokens saved to disk');
    } catch (error) {
      console.error('Error saving Spotify tokens:', error);
    }
  }

  async loadSpotifyTokens() {
    try {
      const data = await fs.readFile(this.spotifyTokenFile, 'utf8');
      const tokens = JSON.parse(data);
      console.log('Spotify tokens loaded from disk');
      return tokens;
    } catch (error) {
      console.log('No existing Spotify tokens found');
      return null;
    }
  }

  async saveSonosTokens(tokens) {
    try {
      await fs.writeFile(this.sonosTokenFile, JSON.stringify(tokens, null, 2));
      console.log('Sonos tokens saved to disk');
    } catch (error) {
      console.error('Error saving Sonos tokens:', error);
    }
  }

  async loadSonosTokens() {
    try {
      const data = await fs.readFile(this.sonosTokenFile, 'utf8');
      const tokens = JSON.parse(data);
      console.log('Sonos tokens loaded from disk');
      return tokens;
    } catch (error) {
      console.log('No existing Sonos tokens found');
      return null;
    }
  }

  async clearSpotifyTokens() {
    try {
      await fs.unlink(this.spotifyTokenFile);
      console.log('Spotify tokens cleared');
    } catch (error) {
      // File doesn't exist, that's fine
    }
  }

  async clearSonosTokens() {
    try {
      await fs.unlink(this.sonosTokenFile);
      console.log('Sonos tokens cleared');
    } catch (error) {
      // File doesn't exist, that's fine
    }
  }
}

module.exports = new TokenManager();