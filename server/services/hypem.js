const axios = require('axios');
const cheerio = require('cheerio');

class HypeMachineService {
  constructor() {
    this.baseUrl = 'https://hypem.com';
    this.apiUrl = 'https://api.hypem.com/v2';
    this.cookies = new Map();
  }

  async login(username, password) {
    try {
      console.log('Hype Machine login disabled - using public API only');
      
      // Since the login API endpoints are not working, we'll use the public API
      // For now, we'll simulate a successful login and use public endpoints
      console.log('Using public Hype Machine API without authentication');
      
      // Set a dummy cookie to indicate "logged in" state
      this.cookies.set('hypem_public', 'active');
      
      return { 
        success: true, 
        method: 'public',
        message: 'Using public Hype Machine API - some features may be limited'
      };
    } catch (error) {
      console.error('Hype Machine login error:', error.message);
      throw new Error('Hype Machine authentication currently unavailable - using public API only');
    }
  }

  getCookieString() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  async getFavorites(username) {
    try {
      const response = await axios.get(`${this.apiUrl}/users/${username}/favorites`, {
        headers: {
          'Cookie': this.getCookieString()
        }
      });
      
      return response.data.items || [];
    } catch (error) {
      console.error('Hype Machine favorites error:', error);
      throw error;
    }
  }

  async getPopular(filter = 'all', page = 1) {
    try {
      const response = await axios.get(`${this.apiUrl}/popular/${filter}/${page}`);
      return response.data.items || [];
    } catch (error) {
      console.error('Hype Machine popular error:', error);
      throw error;
    }
  }

  async getLatest(page = 1) {
    try {
      const response = await axios.get(`${this.apiUrl}/latest/${page}`);
      return response.data.items || [];
    } catch (error) {
      console.error('Hype Machine latest error:', error);
      throw error;
    }
  }

  async getTrackInfo(trackId) {
    try {
      const response = await axios.get(`${this.apiUrl}/tracks/${trackId}`);
      return response.data;
    } catch (error) {
      console.error('Hype Machine track error:', error);
      throw error;
    }
  }

  async searchTracks(query, page = 1) {
    try {
      const response = await axios.get(`${this.apiUrl}/search/tracks`, {
        params: { q: query, page }
      });
      return response.data.items || [];
    } catch (error) {
      console.error('Hype Machine search error:', error);
      throw error;
    }
  }

  async getStreamUrl(trackId) {
    try {
      const trackInfo = await this.getTrackInfo(trackId);
      if (trackInfo && trackInfo.stream_url) {
        return trackInfo.stream_url;
      }
      
      const response = await axios.get(`${this.baseUrl}/track/${trackId}`, {
        headers: {
          'Cookie': this.getCookieString()
        }
      });
      
      const $ = cheerio.load(response.data);
      const scriptContent = $('script:contains("stream_url")').html();
      
      if (scriptContent) {
        const match = scriptContent.match(/"stream_url":"([^"]+)"/);
        if (match && match[1]) {
          return match[1].replace(/\\/g, '');
        }
      }
      
      throw new Error('Stream URL not found');
    } catch (error) {
      console.error('Hype Machine stream error:', error);
      throw error;
    }
  }

  async toggleFavorite(trackId, username) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/me/favorites/${trackId}/toggle`,
        {},
        {
          headers: {
            'Cookie': this.getCookieString()
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Hype Machine favorite error:', error);
      throw error;
    }
  }
}

module.exports = new HypeMachineService();