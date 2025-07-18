const EventEmitter = require('events');

class BeatTracker extends EventEmitter {
  constructor() {
    super();
    this.currentTrack = null;
    this.trackAnalysis = null;
    this.startTime = null;
    this.beatInterval = null;
    this.sectionInterval = null;
    this.isPlaying = false;
    this.currentBeatIndex = 0;
    this.currentSectionIndex = 0;
    this.beatPrecision = 50; // Check every 50ms for beat accuracy
  }

  startTracking(track, analysis) {
    this.stopTracking();
    
    this.currentTrack = track;
    this.trackAnalysis = analysis;
    this.startTime = Date.now();
    this.isPlaying = true;
    this.currentBeatIndex = 0;
    this.currentSectionIndex = 0;

    console.log(`Starting beat tracking for: ${track.title} by ${track.artist}`);
    console.log(`Track has ${analysis.processed.totalBeats} beats and ${analysis.processed.totalSections} sections`);

    // Start high-precision beat tracking
    this.startBeatTracking();
    
    // Start section tracking
    this.startSectionTracking();

    this.emit('trackingStarted', {
      track: this.currentTrack,
      analysis: this.trackAnalysis,
      totalBeats: analysis.processed.totalBeats,
      totalSections: analysis.processed.totalSections
    });
  }

  startBeatTracking() {
    const beats = this.trackAnalysis.beats;
    if (!beats || beats.length === 0) return;

    this.beatInterval = setInterval(() => {
      if (!this.isPlaying) return;

      const currentTime = (Date.now() - this.startTime) / 1000; // Convert to seconds
      
      // Find the current beat
      const currentBeat = beats.find((beat, index) => {
        const nextBeat = beats[index + 1];
        return currentTime >= beat.start && 
               (nextBeat ? currentTime < nextBeat.start : true);
      });

      if (currentBeat) {
        const beatIndex = beats.indexOf(currentBeat);
        
        // Check if we're at a new beat
        if (beatIndex !== this.currentBeatIndex) {
          this.currentBeatIndex = beatIndex;
          const processedBeat = this.trackAnalysis.processed.beatMap[beatIndex];
          
          this.emit('beat', {
            beat: currentBeat,
            processed: processedBeat,
            index: beatIndex,
            progress: currentTime / this.trackAnalysis.duration,
            timeRemaining: this.trackAnalysis.duration - currentTime,
            isDownbeat: processedBeat?.isDownbeat || false,
            measurePosition: processedBeat?.measurePosition || 0
          });

          // Emit special events for downbeats
          if (processedBeat?.isDownbeat) {
            this.emit('downbeat', {
              beat: currentBeat,
              measure: Math.floor(beatIndex / 4),
              progress: currentTime / this.trackAnalysis.duration
            });
          }
        }
      }
    }, this.beatPrecision);
  }

  startSectionTracking() {
    const sections = this.trackAnalysis.sections;
    if (!sections || sections.length === 0) return;

    this.sectionInterval = setInterval(() => {
      if (!this.isPlaying) return;

      const currentTime = (Date.now() - this.startTime) / 1000;
      
      // Find the current section
      const currentSection = sections.find((section, index) => {
        const nextSection = sections[index + 1];
        return currentTime >= section.start && 
               (nextSection ? currentTime < nextSection.start : true);
      });

      if (currentSection) {
        const sectionIndex = sections.indexOf(currentSection);
        
        // Check if we're in a new section
        if (sectionIndex !== this.currentSectionIndex) {
          this.currentSectionIndex = sectionIndex;
          const processedSection = this.trackAnalysis.processed.sectionMap[sectionIndex];
          
          this.emit('sectionChange', {
            section: currentSection,
            processed: processedSection,
            index: sectionIndex,
            progress: currentTime / this.trackAnalysis.duration,
            sectionProgress: (currentTime - currentSection.start) / currentSection.duration,
            type: processedSection?.type || 'unknown'
          });

          // Emit specific section type events
          if (processedSection?.type) {
            this.emit(`section:${processedSection.type}`, {
              section: currentSection,
              processed: processedSection,
              index: sectionIndex
            });
          }
        }
      }
    }, this.beatPrecision);
  }

  pause() {
    this.isPlaying = false;
    this.emit('paused', {
      currentBeat: this.currentBeatIndex,
      currentSection: this.currentSectionIndex
    });
  }

  resume() {
    if (this.currentTrack && this.trackAnalysis) {
      this.isPlaying = true;
      this.emit('resumed', {
        currentBeat: this.currentBeatIndex,
        currentSection: this.currentSectionIndex
      });
    }
  }

  stopTracking() {
    this.isPlaying = false;
    this.currentTrack = null;
    this.trackAnalysis = null;
    this.startTime = null;
    this.currentBeatIndex = 0;
    this.currentSectionIndex = 0;

    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }

    if (this.sectionInterval) {
      clearInterval(this.sectionInterval);
      this.sectionInterval = null;
    }

    this.emit('trackingStopped');
  }

  seek(positionSeconds) {
    if (!this.isPlaying || !this.trackAnalysis) return;

    // Update our position
    this.startTime = Date.now() - (positionSeconds * 1000);
    
    // Find the current beat and section at the new position
    const beats = this.trackAnalysis.beats;
    const sections = this.trackAnalysis.sections;
    
    if (beats && beats.length > 0) {
      const currentBeat = beats.find(beat => 
        positionSeconds >= beat.start && positionSeconds < beat.start + beat.duration
      );
      this.currentBeatIndex = currentBeat ? beats.indexOf(currentBeat) : 0;
    }

    if (sections && sections.length > 0) {
      const currentSection = sections.find(section => 
        positionSeconds >= section.start && positionSeconds < section.start + section.duration
      );
      this.currentSectionIndex = currentSection ? sections.indexOf(currentSection) : 0;
    }

    this.emit('seeked', {
      position: positionSeconds,
      currentBeat: this.currentBeatIndex,
      currentSection: this.currentSectionIndex
    });
  }

  getCurrentState() {
    if (!this.isPlaying || !this.trackAnalysis) {
      return { isPlaying: false };
    }

    const currentTime = (Date.now() - this.startTime) / 1000;
    const currentBeat = this.trackAnalysis.processed.beatMap[this.currentBeatIndex];
    const currentSection = this.trackAnalysis.processed.sectionMap[this.currentSectionIndex];

    return {
      isPlaying: this.isPlaying,
      track: this.currentTrack,
      currentTime,
      progress: currentTime / this.trackAnalysis.duration,
      currentBeat: {
        index: this.currentBeatIndex,
        data: currentBeat
      },
      currentSection: {
        index: this.currentSectionIndex,
        data: currentSection
      },
      totalBeats: this.trackAnalysis.processed.totalBeats,
      totalSections: this.trackAnalysis.processed.totalSections
    };
  }

  // Get upcoming beats for predictive automation
  getUpcomingBeats(lookAheadSeconds = 2) {
    if (!this.isPlaying || !this.trackAnalysis) return [];

    const currentTime = (Date.now() - this.startTime) / 1000;
    const beats = this.trackAnalysis.beats;
    
    return beats.filter(beat => 
      beat.start > currentTime && 
      beat.start <= currentTime + lookAheadSeconds
    ).map(beat => ({
      ...beat,
      timeUntil: beat.start - currentTime,
      processed: this.trackAnalysis.processed.beatMap[beats.indexOf(beat)]
    }));
  }

  // Get upcoming section changes
  getUpcomingSectionChanges(lookAheadSeconds = 10) {
    if (!this.isPlaying || !this.trackAnalysis) return [];

    const currentTime = (Date.now() - this.startTime) / 1000;
    const sections = this.trackAnalysis.sections;
    
    return sections.filter(section => 
      section.start > currentTime && 
      section.start <= currentTime + lookAheadSeconds
    ).map(section => ({
      ...section,
      timeUntil: section.start - currentTime,
      processed: this.trackAnalysis.processed.sectionMap[sections.indexOf(section)]
    }));
  }
}

module.exports = new BeatTracker();