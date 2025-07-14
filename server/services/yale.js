const axios = require('axios');

class YaleService {
  constructor() {
    this.apiUrl = 'https://api.august.com';
    this.token = process.env.YALE_ACCESS_TOKEN;
    this.clientId = process.env.YALE_CLIENT_ID;
    this.clientSecret = process.env.YALE_CLIENT_SECRET;
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async refreshToken() {
    try {
      const response = await axios.post(`${this.apiUrl}/oauth/token`, {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      });
      
      this.token = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      return this.token;
    } catch (error) {
      console.error('Yale token refresh error:', error);
      throw error;
    }
  }

  async getLocks() {
    try {
      const response = await axios.get(`${this.apiUrl}/locks`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        await this.refreshToken();
        return this.getLocks();
      }
      throw error;
    }
  }

  async getLockStatus(lockId) {
    try {
      const response = await axios.get(`${this.apiUrl}/locks/${lockId}/status`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Yale API error:', error);
      throw error;
    }
  }

  async controlLock(lockId, action) {
    try {
      const endpoint = action === 'lock' ? 'lock' : 'unlock';
      const response = await axios.post(
        `${this.apiUrl}/locks/${lockId}/${endpoint}`,
        {},
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Yale API error:', error);
      throw error;
    }
  }

  async getActivity(lockId, limit = 20) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/locks/${lockId}/activity?limit=${limit}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Yale API error:', error);
      throw error;
    }
  }

  async createGuestAccess(lockId, name, startTime, endTime) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/locks/${lockId}/guestentries`,
        {
          name,
          starts_at: startTime,
          ends_at: endTime,
          type: 'time_bound'
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Yale API error:', error);
      throw error;
    }
  }
}

module.exports = new YaleService();