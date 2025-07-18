const EventEmitter = require('events');
const cron = require('node-cron');
const unifiedMusicService = require('./unifiedMusic');
const switchBotService = require('./switchbot');
const sonosService = require('./sonos');
const beatTracker = require('./beatTracker');

class AutomationEngine extends EventEmitter {
  constructor() {
    super();
    this.rules = new Map();
    this.scenes = new Map();
    this.activeJobs = new Map();
    this.setupEventListeners();
  }

  setupEventListeners() {
    unifiedMusicService.on('moodChanged', (mood) => {
      this.handleMoodChange(mood);
    });

    unifiedMusicService.on('nowPlayingChanged', (track) => {
      this.handleTrackChange(track);
    });

    // Beat tracker events for real-time automation
    beatTracker.on('beat', (data) => {
      this.handleBeatEvent(data);
    });

    beatTracker.on('downbeat', (data) => {
      this.handleDownbeatEvent(data);
    });

    beatTracker.on('sectionChange', (data) => {
      this.handleSectionChange(data);
    });

    // Section-specific events
    ['intro', 'verse', 'chorus', 'bridge', 'outro'].forEach(sectionType => {
      beatTracker.on(`section:${sectionType}`, (data) => {
        this.handleSectionTypeEvent(sectionType, data);
      });
    });
  }

  async getRules(userId) {
    return Array.from(this.rules.values()).filter(rule => rule.userId === userId);
  }

  async createRule(userId, ruleData) {
    const rule = {
      id: Date.now().toString(),
      userId,
      name: ruleData.name,
      trigger: ruleData.trigger,
      conditions: ruleData.conditions || [],
      actions: ruleData.actions,
      enabled: true,
      createdAt: new Date()
    };

    this.rules.set(rule.id, rule);
    
    if (rule.trigger.type === 'schedule') {
      this.scheduleRule(rule);
    }
    
    return rule;
  }

  async updateRule(ruleId, updates) {
    const rule = this.rules.get(ruleId);
    if (!rule) throw new Error('Rule not found');

    Object.assign(rule, updates);
    this.rules.set(ruleId, rule);

    if (this.activeJobs.has(ruleId)) {
      this.activeJobs.get(ruleId).stop();
      this.activeJobs.delete(ruleId);
    }

    if (rule.enabled && rule.trigger.type === 'schedule') {
      this.scheduleRule(rule);
    }

    return rule;
  }

  async deleteRule(ruleId) {
    if (this.activeJobs.has(ruleId)) {
      this.activeJobs.get(ruleId).stop();
      this.activeJobs.delete(ruleId);
    }
    
    return this.rules.delete(ruleId);
  }

  scheduleRule(rule) {
    if (rule.trigger.type !== 'schedule') return;

    const job = cron.schedule(rule.trigger.cron, async () => {
      await this.executeRule(rule);
    });

    this.activeJobs.set(rule.id, job);
  }

  async executeRule(rule) {
    if (!rule.enabled) return;

    const conditionsMet = await this.checkConditions(rule.conditions);
    if (!conditionsMet) return;

    for (const action of rule.actions) {
      await this.executeAction(action);
    }

    this.emit('ruleExecuted', rule);
  }

  async checkConditions(conditions) {
    for (const condition of conditions) {
      const met = await this.checkCondition(condition);
      if (!met) return false;
    }
    return true;
  }

  async checkCondition(condition) {
    switch (condition.type) {
      case 'time':
        return this.checkTimeCondition(condition);
      case 'presence':
        return this.checkPresenceCondition(condition);
      case 'music':
        return this.checkMusicCondition(condition);
      case 'device':
        return this.checkDeviceCondition(condition);
      default:
        return true;
    }
  }

  checkTimeCondition(condition) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;
    
    const [startHour, startMin] = condition.startTime.split(':').map(Number);
    const [endHour, endMin] = condition.endTime.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    return currentTime >= startTime && currentTime <= endTime;
  }

  async checkPresenceCondition(condition) {
    // Yale integration removed - return false for now
    // Could be replaced with other presence detection methods
    return false;
  }

  async checkMusicCondition(condition) {
    const nowPlaying = await unifiedMusicService.getNowPlaying();
    
    switch (condition.attribute) {
      case 'playing':
        return condition.value ? !!nowPlaying : !nowPlaying;
      case 'mood':
        const mood = nowPlaying ? await unifiedMusicService.analyzeTrackMood(nowPlaying) : null;
        return mood === condition.value;
      default:
        return true;
    }
  }

  async checkDeviceCondition(condition) {
    const status = await switchBotService.getDeviceStatus(condition.deviceId);
    return status[condition.attribute] === condition.value;
  }

  async executeAction(action) {
    switch (action.type) {
      case 'device':
        return this.executeDeviceAction(action);
      case 'music':
        return this.executeMusicAction(action);
      case 'scene':
        return this.executeSceneAction(action);
      case 'notification':
        return this.executeNotificationAction(action);
      default:
        console.error('Unknown action type:', action.type);
    }
  }

  async executeDeviceAction(action) {
    switch (action.device) {
      case 'switchbot':
        return switchBotService.sendCommand(action.deviceId, action.command, action.parameter);
      case 'sonos':
        return sonosService.controlSpeaker(action.deviceId, action.command, action.value);
      default:
        console.error('Unknown device type:', action.device);
    }
  }

  async executeMusicAction(action) {
    switch (action.command) {
      case 'play':
        return sonosService.play(null, action.groupId);
      case 'pause':
        return sonosService.pause(null, action.groupId);
      case 'playlist':
        const playlist = await unifiedMusicService.createSmartPlaylist(action.mood, action.duration);
        for (const track of playlist) {
          await unifiedMusicService.addToQueue(track.source, track.trackId);
        }
        return unifiedMusicService.playNext();
      case 'volume':
        return sonosService.setVolume(null, action.groupId, action.value);
    }
  }

  async executeSceneAction(action) {
    return this.activateScene(action.sceneId);
  }

  executeNotificationAction(action) {
    this.emit('notification', {
      title: action.title,
      message: action.message,
      priority: action.priority || 'normal'
    });
  }

  async getScenes(userId) {
    return Array.from(this.scenes.values()).filter(scene => scene.userId === userId);
  }

  async createScene(userId, sceneData) {
    const scene = {
      id: Date.now().toString(),
      userId,
      name: sceneData.name,
      icon: sceneData.icon,
      actions: sceneData.actions,
      createdAt: new Date()
    };

    this.scenes.set(scene.id, scene);
    return scene;
  }

  async activateScene(sceneId) {
    const scene = this.scenes.get(sceneId);
    if (!scene) throw new Error('Scene not found');

    const results = [];
    for (const action of scene.actions) {
      try {
        await this.executeAction(action);
        results.push({ action, success: true });
      } catch (error) {
        results.push({ action, success: false, error: error.message });
      }
    }

    this.emit('sceneActivated', { scene, results });
    return results;
  }

  async handleMoodChange(mood) {
    const moodRules = Array.from(this.rules.values()).filter(rule => 
      rule.enabled && 
      rule.trigger.type === 'mood' && 
      rule.trigger.mood === mood
    );

    for (const rule of moodRules) {
      await this.executeRule(rule);
    }
  }

  async handleTrackChange(track) {
    const beatRules = Array.from(this.rules.values()).filter(rule => 
      rule.enabled && 
      rule.trigger.type === 'beat'
    );

    if (beatRules.length > 0 && track) {
      const { analysis } = await unifiedMusicService.analyzeTrack(track.trackId, track.source);
      const beatInterval = 60000 / analysis.tempo;

      for (const rule of beatRules) {
        const beatJob = setInterval(() => {
          this.executeAction(rule.actions[0]);
        }, beatInterval);

        setTimeout(() => {
          clearInterval(beatJob);
        }, track.duration);
      }
    }
  }

  async handleBeatEvent(data) {
    const beatRules = Array.from(this.rules.values()).filter(rule => 
      rule.enabled && 
      rule.trigger.type === 'beat'
    );

    for (const rule of beatRules) {
      await this.executeRule(rule);
    }
  }

  async handleDownbeatEvent(data) {
    const downbeatRules = Array.from(this.rules.values()).filter(rule => 
      rule.enabled && 
      rule.trigger.type === 'downbeat'
    );

    for (const rule of downbeatRules) {
      await this.executeRule(rule);
    }
  }

  async handleSectionChange(data) {
    const sectionRules = Array.from(this.rules.values()).filter(rule => 
      rule.enabled && 
      rule.trigger.type === 'section'
    );

    for (const rule of sectionRules) {
      await this.executeRule(rule);
    }
  }

  async handleSectionTypeEvent(sectionType, data) {
    const sectionTypeRules = Array.from(this.rules.values()).filter(rule => 
      rule.enabled && 
      rule.trigger.type === 'sectionType' &&
      rule.trigger.sectionType === sectionType
    );

    for (const rule of sectionTypeRules) {
      await this.executeRule(rule);
    }
  }

  createGestureHandler() {
    return async (deviceId, pattern) => {
      const gestureRules = Array.from(this.rules.values()).filter(rule => 
        rule.enabled && 
        rule.trigger.type === 'gesture' &&
        rule.trigger.deviceId === deviceId &&
        rule.trigger.pattern === pattern
      );

      for (const rule of gestureRules) {
        await this.executeRule(rule);
      }
    };
  }
}

module.exports = new AutomationEngine();