/**
 * Sounds Service - Manages all audio for Chrono Chat
 * Handles notifications, message sounds, and UI feedback audio
 */

interface AudioConfig {
  volume: number;
  enabled: boolean;
}

class SoundsService {
  private audioContext: AudioContext | null = null;
  private config: AudioConfig = {
    volume: 0.3,
    enabled: true,
  };

  constructor() {
    this.initialize();
  }

  /**
   * Initialize AudioContext (lazy loaded to comply with browser autoplay policies)
   */
  private initialize() {
    if (typeof window !== 'undefined' && !this.audioContext) {
      try {
        // Use window.AudioContext or webkit version for Safari
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        // Don't create context yet - will be created on first user interaction
      } catch (e) {
        console.warn('⚠️ AudioContext not supported:', e);
      }
    }
  }

  /**
   * Get or create AudioContext (requires user interaction first)
   */
  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    return this.audioContext;
  }

  /**
   * Play a simple beep sound (no audio file needed)
   */
  playBeep(frequency: number = 1000, duration: number = 200) {
    if (!this.config.enabled) return;

    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscNode = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscNode.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscNode.frequency.value = frequency;
      oscNode.type = 'sine';

      gainNode.gain.setValueAtTime(this.config.volume * 0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

      oscNode.start(ctx.currentTime);
      oscNode.stop(ctx.currentTime + duration / 1000);
    } catch (e) {
      console.warn('⚠️ Could not play beep:', e);
    }
  }

  /**
   * Play message sent sound - cheerful ascending tone
   */
  playMessageSent() {
    if (!this.config.enabled) return;

    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const notes = [659, 784, 988]; // E5, G5, B5
      const duration = 60;

      notes.forEach((freq, index) => {
        const oscNode = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscNode.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscNode.frequency.value = freq;
        oscNode.type = 'sine';

        const startTime = ctx.currentTime + (index * duration) / 1000;
        gainNode.gain.setValueAtTime(this.config.volume * 0.2, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + (duration * 0.8) / 1000);

        oscNode.start(startTime);
        oscNode.stop(startTime + (duration * 0.8) / 1000);
      });
    } catch (e) {
      console.warn('⚠️ Could not play sent sound:', e);
    }
  }

  /**
   * Play message received sound - pleasant ding
   */
  playMessageReceived() {
    if (!this.config.enabled) return;

    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Two harmonious tones
      const frequencies = [523.25, 659.25]; // C5, E5
      
      frequencies.forEach((freq, index) => {
        const oscNode = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscNode.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscNode.frequency.value = freq;
        oscNode.type = 'sine';

        const startTime = ctx.currentTime + (index * 30) / 1000;
        gainNode.gain.setValueAtTime(this.config.volume * 0.25, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

        oscNode.start(startTime);
        oscNode.stop(startTime + 0.15);
      });
    } catch (e) {
      console.warn('⚠️ Could not play received sound:', e);
    }
  }

  /**
   * Play notification sound
   */
  playNotification() {
    if (!this.config.enabled) return;

    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscNode = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscNode.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscNode.frequency.value = 800;
      oscNode.type = 'sine';

      gainNode.gain.setValueAtTime(this.config.volume * 0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      oscNode.start(ctx.currentTime);
      oscNode.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.warn('⚠️ Could not play notification sound:', e);
    }
  }

  /**
   * Play typing sound (subtle tick)
   */
  playTyping() {
    if (!this.config.enabled) return;

    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscNode = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscNode.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscNode.frequency.value = 1200;
      oscNode.type = 'sine';

      gainNode.gain.setValueAtTime(this.config.volume * 0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      oscNode.start(ctx.currentTime);
      oscNode.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.warn('⚠️ Could not play typing sound:', e);
    }
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number) {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.config.volume;
  }

  /**
   * Enable/disable all sounds
   */
  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

// Export singleton instance
export const soundsService = new SoundsService();
export { SoundsService };
