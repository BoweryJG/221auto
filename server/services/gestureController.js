const EventEmitter = require('events');

class GestureController extends EventEmitter {
  constructor() {
    super();
    this.patterns = new Map();
    this.activeGestures = new Map();
    this.setupDefaultPatterns();
  }

  setupDefaultPatterns() {
    // Music control patterns
    this.registerPattern('double-tap', {
      sequence: ['press', 'release', 'press', 'release'],
      maxInterval: 500,
      action: 'music-next'
    });

    this.registerPattern('triple-tap', {
      sequence: ['press', 'release', 'press', 'release', 'press', 'release'],
      maxInterval: 700,
      action: 'music-previous'
    });

    this.registerPattern('long-press', {
      sequence: ['press'],
      minDuration: 1000,
      action: 'music-pause-play'
    });

    this.registerPattern('press-hold-release', {
      sequence: ['press', 'hold', 'release'],
      minHoldDuration: 2000,
      action: 'scene-toggle'
    });

    // Volume control patterns
    this.registerPattern('quick-double-long', {
      sequence: ['press', 'release', 'press', 'release', 'press'],
      maxInterval: 400,
      minLastDuration: 1000,
      action: 'volume-up'
    });

    this.registerPattern('long-quick-quick', {
      sequence: ['press', 'release', 'press', 'release'],
      minFirstDuration: 1000,
      maxInterval: 400,
      action: 'volume-down'
    });

    // Scene patterns
    this.registerPattern('morse-m', {
      sequence: ['press', 'release', 'press'],
      timing: [700, 200, 700],
      tolerance: 200,
      action: 'scene-morning'
    });

    this.registerPattern('morse-p', {
      sequence: ['press', 'release', 'press', 'release', 'press'],
      timing: [200, 200, 700, 200, 700],
      tolerance: 200,
      action: 'scene-party'
    });

    this.registerPattern('morse-s', {
      sequence: ['press', 'release', 'press', 'release', 'press'],
      timing: [200, 200, 200, 200, 200],
      tolerance: 150,
      action: 'scene-sleep'
    });
  }

  registerPattern(name, config) {
    this.patterns.set(name, {
      name,
      ...config
    });
  }

  processDeviceEvent(deviceId, event) {
    if (!this.activeGestures.has(deviceId)) {
      this.activeGestures.set(deviceId, {
        events: [],
        timeouts: []
      });
    }

    const gesture = this.activeGestures.get(deviceId);
    
    // Clear previous timeouts
    gesture.timeouts.forEach(timeout => clearTimeout(timeout));
    gesture.timeouts = [];

    // Add new event
    gesture.events.push({
      type: event.type,
      timestamp: Date.now()
    });

    // Check for pattern matches
    const match = this.checkPatterns(gesture.events);
    
    if (match) {
      this.emit('gesture', {
        deviceId,
        pattern: match.name,
        action: match.action
      });
      
      // Clear gesture history after match
      gesture.events = [];
    } else {
      // Set timeout to clear gesture if no more events
      const timeout = setTimeout(() => {
        gesture.events = [];
      }, 2000);
      
      gesture.timeouts.push(timeout);
    }
  }

  checkPatterns(events) {
    if (events.length === 0) return null;

    for (const [name, pattern] of this.patterns) {
      if (this.matchesPattern(events, pattern)) {
        return pattern;
      }
    }

    return null;
  }

  matchesPattern(events, pattern) {
    // Check sequence length
    const eventTypes = events.map(e => e.type);
    
    if (pattern.sequence) {
      // Simple sequence matching
      if (eventTypes.length < pattern.sequence.length) {
        return false;
      }

      const recentEvents = eventTypes.slice(-pattern.sequence.length);
      if (!this.arraysEqual(recentEvents, pattern.sequence)) {
        return false;
      }

      // Check timing constraints
      if (pattern.maxInterval) {
        for (let i = 1; i < events.length; i++) {
          const interval = events[i].timestamp - events[i-1].timestamp;
          if (interval > pattern.maxInterval) {
            return false;
          }
        }
      }

      if (pattern.minDuration && events[0].type === 'press') {
        const lastEvent = events[events.length - 1];
        if (lastEvent.type === 'press') {
          const duration = Date.now() - events[0].timestamp;
          if (duration < pattern.minDuration) {
            return false;
          }
        }
      }

      if (pattern.timing) {
        return this.matchesTiming(events, pattern.timing, pattern.tolerance || 100);
      }

      return true;
    }

    return false;
  }

  matchesTiming(events, expectedTiming, tolerance) {
    if (events.length < expectedTiming.length + 1) {
      return false;
    }

    const actualTiming = [];
    for (let i = 1; i < events.length; i++) {
      actualTiming.push(events[i].timestamp - events[i-1].timestamp);
    }

    for (let i = 0; i < expectedTiming.length; i++) {
      const expected = expectedTiming[i];
      const actual = actualTiming[i];
      
      if (Math.abs(actual - expected) > tolerance) {
        return false;
      }
    }

    return true;
  }

  arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  trainPattern(deviceId, name, events) {
    // Calculate timing from events
    const sequence = events.map(e => e.type);
    const timing = [];
    
    for (let i = 1; i < events.length; i++) {
      timing.push(events[i].timestamp - events[i-1].timestamp);
    }

    const pattern = {
      sequence,
      timing,
      tolerance: 200,
      action: `custom-${name}`,
      trained: true,
      deviceId
    };

    this.registerPattern(`custom-${deviceId}-${name}`, pattern);
    
    return pattern;
  }

  getPatterns() {
    return Array.from(this.patterns.values());
  }

  clearDeviceGestures(deviceId) {
    if (this.activeGestures.has(deviceId)) {
      const gesture = this.activeGestures.get(deviceId);
      gesture.timeouts.forEach(timeout => clearTimeout(timeout));
      this.activeGestures.delete(deviceId);
    }
  }
}

module.exports = new GestureController();