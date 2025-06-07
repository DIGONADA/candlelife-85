
class EnhancedNotificationSoundService {
  private audio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private isEnabled = true;
  private isInitialized = false;
  private unlockAttempted = false;

  constructor() {
    this.initializeAudio();
  }

  private async initializeAudio() {
    try {
      // Create audio context for better mobile compatibility
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Try to load audio file
      this.audio = new Audio('/notification-sound.mp3');
      this.audio.preload = 'auto';
      this.audio.volume = 0.8;
      
      // Setup mobile audio unlock
      this.setupMobileAudioUnlock();
      
      this.isInitialized = true;
      console.log('🔊 Enhanced notification sound service initialized');
    } catch (error) {
      console.warn('Failed to initialize enhanced notification sound:', error);
      this.createFallbackSound();
    }
  }

  private setupMobileAudioUnlock() {
    if (this.unlockAttempted) return;

    const unlockAudio = async () => {
      this.unlockAttempted = true;
      
      try {
        // Resume audio context if suspended
        if (this.audioContext && this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
          console.log('🔊 Audio context resumed for mobile');
        }
        
        // Prepare audio for playback
        if (this.audio && this.audio.readyState >= 2) {
          const playPromise = this.audio.play();
          if (playPromise !== undefined) {
            await playPromise;
            this.audio.pause();
            this.audio.currentTime = 0;
            console.log('🔊 Audio unlocked for mobile');
          }
        }
      } catch (error) {
        console.warn('Audio unlock failed:', error);
      }
      
      // Remove listeners after first successful interaction
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };

    // Add multiple event listeners for different interaction types
    document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
  }

  private async createFallbackSound() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Create a synthesized beep sound as fallback
      this.audio = {
        play: async () => {
          if (!this.audioContext) return;
          
          const oscillator = this.audioContext.createOscillator();
          const gainNode = this.audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(this.audioContext.destination);
          
          // Create a pleasant notification sound
          oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
          oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
          
          oscillator.start(this.audioContext.currentTime);
          oscillator.stop(this.audioContext.currentTime + 0.5);
          
          return Promise.resolve();
        }
      } as any;
      
      console.log('🔊 Fallback notification sound created');
    } catch (error) {
      console.warn('Failed to create fallback sound:', error);
    }
  }

  async play() {
    if (!this.isEnabled || !this.audio) {
      console.log('🔇 Notification sound disabled or not available');
      return;
    }

    try {
      // Ensure audio context is active for mobile
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      console.log('🔊 Playing enhanced notification sound');
      
      // Reset audio to beginning
      if (this.audio.currentTime > 0) {
        this.audio.currentTime = 0;
      }
      
      const playPromise = this.audio.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        console.log('✅ Enhanced notification sound played successfully');
      }
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
      
      // Try fallback sound if main sound fails
      try {
        await this.createFallbackSound();
        if (this.audio) {
          await this.audio.play();
          console.log('✅ Fallback sound played successfully');
        }
      } catch (fallbackError) {
        console.warn('Fallback sound also failed:', fallbackError);
      }
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    console.log(`🔊 Enhanced notification sound ${enabled ? 'enabled' : 'disabled'}`);
  }

  isAudioEnabled() {
    return this.isEnabled;
  }

  async testSound() {
    console.log('🧪 Testing enhanced notification sound');
    await this.play();
  }
}

export const enhancedNotificationSoundService = new EnhancedNotificationSoundService();
