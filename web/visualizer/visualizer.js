class MusicVisualizer {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.mode = 'waves';
        this.ws = null;
        this.audioData = {
            tempo: 120,
            energy: 0.5,
            mood: 'neutral',
            amplitude: new Array(128).fill(0),
            frequency: new Array(128).fill(0)
        };
        this.particles = [];
        this.time = 0;
        
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Connect WebSocket
        this.connectWebSocket();
        
        // Setup controls
        this.setupControls();
        
        // Start animation
        this.animate();
        
        // Simulate audio data for demo
        this.simulateAudioData();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    connectWebSocket() {
        const wsUrl = window.location.hostname === 'localhost' 
            ? 'ws://localhost:3000/ws'
            : 'wss://homeflow-backend.onrender.com/ws';
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('Connected to HomeFlow');
            this.updateDevice('Sonos', 'Connected');
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.ws.onclose = () => {
            console.log('Disconnected from HomeFlow');
            setTimeout(() => this.connectWebSocket(), 3000);
        };
    }

    handleWebSocketMessage(data) {
        if (data.type === 'nowPlaying') {
            document.getElementById('trackTitle').textContent = data.track.title;
            document.getElementById('trackArtist').textContent = data.track.artist;
            
            if (data.track.mood) {
                this.audioData.mood = data.track.mood;
                this.updateMoodBadge(data.track.mood);
            }
        } else if (data.type === 'musicAnalysis') {
            this.audioData.tempo = data.tempo;
            this.audioData.energy = data.energy;
        } else if (data.type === 'deviceStatus') {
            this.updateDevice(data.device, data.status);
        } else if (data.type === 'beat') {
            this.onBeat();
        }
    }

    updateMoodBadge(mood) {
        const badge = document.getElementById('moodBadge');
        badge.className = `mood-badge mood-${mood}`;
        badge.textContent = mood.toUpperCase();
    }

    updateDevice(device, status) {
        const devices = document.querySelectorAll('.device');
        devices.forEach(d => {
            if (d.textContent.includes(device)) {
                d.textContent = `${device}: ${status}`;
                d.classList.add('active');
                setTimeout(() => d.classList.remove('active'), 1000);
            }
        });
    }

    setupControls() {
        const modeBtn = document.getElementById('modeBtn');
        const modes = ['waves', 'particles', 'bars', 'spiral', 'matrix'];
        let modeIndex = 0;
        
        modeBtn.addEventListener('click', () => {
            modeIndex = (modeIndex + 1) % modes.length;
            this.mode = modes[modeIndex];
            modeBtn.textContent = `Mode: ${this.mode.charAt(0).toUpperCase() + this.mode.slice(1)}`;
        });
        
        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
    }

    simulateAudioData() {
        setInterval(() => {
            // Simulate frequency data
            for (let i = 0; i < this.audioData.frequency.length; i++) {
                this.audioData.frequency[i] = Math.random() * 255 * this.audioData.energy;
            }
            
            // Simulate amplitude data
            for (let i = 0; i < this.audioData.amplitude.length; i++) {
                this.audioData.amplitude[i] = Math.sin(this.time * 0.01 + i * 0.1) * 128 + 128;
            }
            
            // Simulate beat detection
            if (Math.random() < 0.02) {
                this.onBeat();
            }
        }, 50);
    }

    onBeat() {
        const indicator = document.getElementById('beatIndicator');
        indicator.classList.remove('pulse');
        void indicator.offsetWidth; // Trigger reflow
        indicator.classList.add('pulse');
        
        // Add particles on beat
        if (this.mode === 'particles') {
            for (let i = 0; i < 10; i++) {
                this.particles.push({
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    life: 1,
                    color: this.getMoodColor()
                });
            }
        }
    }

    getMoodColor() {
        const colors = {
            party: ['#FF6B6B', '#FFE66D'],
            chill: ['#4ECDC4', '#556270'],
            intense: ['#FF6B6B', '#C44569'],
            acoustic: ['#F7B731', '#5F27CD'],
            dance: ['#00D2FF', '#3A7BD5'],
            neutral: ['#667eea', '#764ba2']
        };
        
        const moodColors = colors[this.audioData.mood] || colors.neutral;
        return moodColors[Math.floor(Math.random() * moodColors.length)];
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.time++;
        
        // Clear canvas with fade effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw based on mode
        switch (this.mode) {
            case 'waves':
                this.drawWaves();
                break;
            case 'particles':
                this.drawParticles();
                break;
            case 'bars':
                this.drawBars();
                break;
            case 'spiral':
                this.drawSpiral();
                break;
            case 'matrix':
                this.drawMatrix();
                break;
        }
    }

    drawWaves() {
        const centerY = this.canvas.height / 2;
        const amplitude = 100 * this.audioData.energy;
        
        for (let wave = 0; wave < 3; wave++) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = `hsla(${220 + wave * 30}, 70%, 50%, ${0.5 - wave * 0.1})`;
            this.ctx.lineWidth = 3 - wave;
            
            for (let x = 0; x < this.canvas.width; x++) {
                const dataIndex = Math.floor((x / this.canvas.width) * this.audioData.frequency.length);
                const frequency = this.audioData.frequency[dataIndex] / 255;
                
                const y = centerY + 
                    Math.sin((x * 0.01 + this.time * 0.02) * (wave + 1)) * amplitude * frequency +
                    Math.sin((x * 0.02 + this.time * 0.03) * (wave + 1)) * amplitude * 0.5;
                
                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            
            this.ctx.stroke();
        }
    }

    drawBars() {
        const barWidth = this.canvas.width / this.audioData.frequency.length;
        const gradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, 0);
        gradient.addColorStop(0, this.getMoodColor());
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.5)');
        
        this.audioData.frequency.forEach((freq, i) => {
            const barHeight = (freq / 255) * this.canvas.height * 0.8;
            const x = i * barWidth;
            const y = this.canvas.height - barHeight;
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, y, barWidth - 2, barHeight);
            
            // Mirror effect
            this.ctx.fillStyle = `rgba(255, 255, 255, ${0.1 * (freq / 255)})`;
            this.ctx.fillRect(x, y - barHeight * 0.2, barWidth - 2, barHeight * 0.2);
        });
    }

    drawParticles() {
        // Update and draw particles
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.01;
            
            if (particle.life > 0) {
                this.ctx.fillStyle = particle.color + Math.floor(particle.life * 255).toString(16).padStart(2, '0');
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, 3 * particle.life, 0, Math.PI * 2);
                this.ctx.fill();
                return true;
            }
            return false;
        });
    }

    drawSpiral() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const maxRadius = Math.min(centerX, centerY) * 0.8;
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.getMoodColor();
        this.ctx.lineWidth = 2;
        
        for (let i = 0; i < this.audioData.frequency.length; i++) {
            const angle = (i / this.audioData.frequency.length) * Math.PI * 8 + this.time * 0.01;
            const radius = (i / this.audioData.frequency.length) * maxRadius * (this.audioData.frequency[i] / 255);
            
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.stroke();
    }

    drawMatrix() {
        const columns = Math.floor(this.canvas.width / 20);
        const fontSize = 16;
        
        this.ctx.font = `${fontSize}px monospace`;
        this.ctx.fillStyle = this.getMoodColor();
        
        for (let i = 0; i < columns; i++) {
            const dataIndex = Math.floor((i / columns) * this.audioData.frequency.length);
            const intensity = this.audioData.frequency[dataIndex] / 255;
            
            if (Math.random() < intensity * 0.1) {
                const x = i * 20;
                const y = Math.random() * this.canvas.height;
                const char = String.fromCharCode(0x30A0 + Math.random() * 96);
                
                this.ctx.fillText(char, x, y);
            }
        }
    }
}

// Initialize visualizer
const visualizer = new MusicVisualizer();