const axios = require('axios');
const crypto = require('crypto');
const EventEmitter = require('events');
const gestureController = require('./gestureController');

class SwitchBotService extends EventEmitter {
  constructor() {
    super();
    this.apiUrl = 'https://api.switch-bot.com/v1.1';
    this.token = process.env.SWITCHBOT_TOKEN;
    this.secret = process.env.SWITCHBOT_SECRET;
    this.setupGestureHandling();
  }

  setupGestureHandling() {
    gestureController.on('gesture', (data) => {
      this.emit('gesture-detected', data);
    });
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

  handleWebhookEvent(event) {
    if (event.eventType === 'changeReport' && event.context.deviceType === 'Bot') {
      // Process button press events for gesture recognition
      const deviceId = event.context.deviceMac;
      const eventType = event.context.powerState === 'ON' ? 'press' : 'release';
      
      gestureController.processDeviceEvent(deviceId, {
        type: eventType,
        deviceId,
        timestamp: Date.now()
      });
    }
  }

  async enableGestureMode(deviceId) {
    // Configure device for gesture detection
    try {
      await this.sendCommand(deviceId, 'setMode', 'press');
      console.log(`Gesture mode enabled for device ${deviceId}`);
    } catch (error) {
      console.error('Error enabling gesture mode:', error);
      throw error;
    }
  }
}

module.exports = new SwitchBotService();