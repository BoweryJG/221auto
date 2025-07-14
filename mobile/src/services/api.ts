import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api' 
  : 'https://homeflow-api.com/api';

const WS_URL = __DEV__
  ? 'ws://localhost:3000/ws'
  : 'wss://homeflow-api.com/ws';

class ApiService {
  private token: string | null = null;
  private ws: WebSocket | null = null;

  constructor() {
    this.loadToken();
  }

  private async loadToken() {
    try {
      this.token = await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error loading token:', error);
    }
  }

  private async saveToken(token: string) {
    try {
      await AsyncStorage.setItem('authToken', token);
      this.token = token;
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };
  }

  // Auth
  async login(email: string, password: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });
      await this.saveToken(response.data.token);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async register(email: string, password: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        email,
        password,
      });
      await this.saveToken(response.data.token);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Devices
  async getDevices() {
    try {
      const response = await axios.get(`${API_BASE_URL}/devices`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async controlDevice(deviceId: string, command: any) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/devices/${deviceId}/control`,
        command,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Music
  async getNowPlaying() {
    try {
      const response = await axios.get(`${API_BASE_URL}/music/now-playing`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getQueue() {
    try {
      const response = await axios.get(`${API_BASE_URL}/music/queue`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async addToQueue(source: 'spotify' | 'hypem', trackId: string) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/music/queue/add`,
        { source, trackId },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async analyzeTrack(trackId: string, source: 'spotify' | 'hypem') {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/music/analyze`,
        { trackId, source },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Automation
  async getAutomationRules() {
    try {
      const response = await axios.get(`${API_BASE_URL}/automation/rules`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async createRule(rule: any) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/automation/rules`,
        rule,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async activateScene(sceneId: string) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/automation/scenes/${sceneId}/activate`,
        {},
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // WebSocket
  connectWebSocket(onMessage: (data: any) => void, onConnectionChange: (connected: boolean) => void) {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      onConnectionChange(true);
      
      if (this.token) {
        this.ws?.send(JSON.stringify({
          type: 'auth',
          token: this.token,
        }));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      onConnectionChange(false);
      
      // Reconnect after 3 seconds
      setTimeout(() => {
        this.connectWebSocket(onMessage, onConnectionChange);
      }, 3000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export default new ApiService();