const axios = require('axios');
const crypto = require('crypto');

class SwitchBotService {
  constructor() {
    this.apiUrl = 'https://api.switch-bot.com/v1.1';
    this.token = process.env.SWITCHBOT_TOKEN;
    this.secret = process.env.SWITCHBOT_SECRET;
  }

  generateSignature(token, secret, t, nonce) {
    const data = token + t + nonce;
    return crypto.createHmac('sha256', secret).update(data).digest('base64');
  }

  getHeaders() {
    const t = Date.now();
    const nonce = crypto.randomUUID();
    const sign = this.generateSignature(this.token, this.secret, t, nonce);

    return {
      'Authorization': this.token,
      'sign': sign,
      't': t,
      'nonce': nonce,
      'Content-Type': 'application/json'
    };
  }

  async getDevices() {
    try {
      const response = await axios.get(`${this.apiUrl}/devices`, {
        headers: this.getHeaders()
      });
      return response.data.body.deviceList;
    } catch (error) {
      console.error('SwitchBot API error:', error);
      throw error;
    }
  }

  async getDeviceStatus(deviceId) {
    try {
      const response = await axios.get(`${this.apiUrl}/devices/${deviceId}/status`, {
        headers: this.getHeaders()
      });
      return response.data.body;
    } catch (error) {
      console.error('SwitchBot API error:', error);
      throw error;
    }
  }

  async sendCommand(deviceId, command, parameter = 'default') {
    try {
      const response = await axios.post(
        `${this.apiUrl}/devices/${deviceId}/commands`,
        {
          command,
          parameter,
          commandType: 'command'
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('SwitchBot API error:', error);
      throw error;
    }
  }

  async setWebhook(url) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/webhook/setup`,
        { url },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('SwitchBot webhook error:', error);
      throw error;
    }
  }
}

module.exports = new SwitchBotService();