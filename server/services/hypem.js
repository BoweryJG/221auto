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
      const response = await axios.post(`${this.baseUrl}/api/login`, {
        username,
        password
      });
      
      if (response.headers['set-cookie']) {
        response.headers['set-cookie'].forEach(cookie => {
          const [name, value] = cookie.split('=');
          this.cookies.set(name, value.split(';')[0]);
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('Hype Machine login error:', error);
      throw error;
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