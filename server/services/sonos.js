const axios = require('axios');
const EventEmitter = require('events');

class SonosService extends EventEmitter {
  constructor() {
    super();
    this.households = new Map();
    this.groups = new Map();
    this.clientId = process.env.SONOS_CLIENT_ID;
    this.clientSecret = process.env.SONOS_CLIENT_SECRET;
    this.apiUrl = 'https://api.ws.sonos.com/control/api/v1';
  }

  getHeaders(accessToken) {
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  async getHouseholds(accessToken) {
    try {
      const response = await axios.get(`${this.apiUrl}/households`, {
        headers: this.getHeaders(accessToken)
      });
      
      this.households.clear();
      response.data.households.forEach(household => {
        this.households.set(household.id, household);
      });
      
      return response.data.households;
    } catch (error) {
      console.error('Sonos API error:', error);
      throw error;
    }
  }

  async getGroups(accessToken, householdId) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/households/${householdId}/groups`,
        { headers: this.getHeaders(accessToken) }
      );
      
      this.groups.set(householdId, response.data.groups);
      return response.data.groups;
    } catch (error) {
      console.error('Sonos API error:', error);
      throw error;
    }
  }

  async getSpeakers() {
    const speakers = [];
    for (const [householdId, groups] of this.groups) {
      groups.forEach(group => {
        group.players.forEach(player => {
          speakers.push({
            id: player.id,
            name: player.name,
            householdId,
            groupId: group.id,
            coordinator: group.coordinatorId === player.id
          });
        });
      });
    }
    return speakers;
  }

  async controlSpeaker(speakerId, action, value) {
    const accessToken = await this.getAccessToken();
    const speaker = await this.findSpeaker(speakerId);
    
    if (!speaker) {
      throw new Error('Speaker not found');
    }

    const groupId = speaker.groupId;
    const endpoint = `${this.apiUrl}/groups/${groupId}`;

    switch (action) {
      case 'play':
        return this.play(accessToken, groupId);
      case 'pause':
        return this.pause(accessToken, groupId);
      case 'volume':
        return this.setVolume(accessToken, groupId, value);
      case 'next':
        return this.skipToNext(accessToken, groupId);
      case 'previous':
        return this.skipToPrevious(accessToken, groupId);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async play(accessToken, groupId) {
    return axios.post(
      `${this.apiUrl}/groups/${groupId}/playback/play`,
      {},
      { headers: this.getHeaders(accessToken) }
    );
  }

  async pause(accessToken, groupId) {
    return axios.post(
      `${this.apiUrl}/groups/${groupId}/playback/pause`,
      {},
      { headers: this.getHeaders(accessToken) }
    );
  }

  async setVolume(accessToken, groupId, volume) {
    return axios.post(
      `${this.apiUrl}/groups/${groupId}/groupVolume`,
      { volume },
      { headers: this.getHeaders(accessToken) }
    );
  }

  async skipToNext(accessToken, groupId) {
    return axios.post(
      `${this.apiUrl}/groups/${groupId}/playback/skipToNextTrack`,
      {},
      { headers: this.getHeaders(accessToken) }
    );
  }

  async skipToPrevious(accessToken, groupId) {
    return axios.post(
      `${this.apiUrl}/groups/${groupId}/playback/skipToPreviousTrack`,
      {},
      { headers: this.getHeaders(accessToken) }
    );
  }

  async loadSpotifyUri(accessToken, groupId, spotifyUri) {
    return axios.post(
      `${this.apiUrl}/groups/${groupId}/playback/load`,
      {
        uri: spotifyUri,
        playOnCompletion: true
      },
      { headers: this.getHeaders(accessToken) }
    );
  }

  async findSpeaker(speakerId) {
    for (const [householdId, groups] of this.groups) {
      for (const group of groups) {
        const player = group.players.find(p => p.id === speakerId);
        if (player) {
          return {
            ...player,
            householdId,
            groupId: group.id
          };
        }
      }
    }
    return null;
  }

  async getAccessToken() {
    return 'mock-token';
  }
}

module.exports = new SonosService();