
class EnhancedNotificationSoundService {
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
      
      // Setup mobile audio unlock
      this.setupMobileAudioUnlock();
      
      this.isInitialized = true;
      console.log('🔊 Enhanced notification sound service initialized');
    } catch (error) {
      console.warn('Failed to initialize enhanced notification sound:', error);
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

  private async createBeepSound() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create a pleasant notification sound
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Create a pleasant notification sound (two-tone beep)
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
      oscillator.type = 'sine';
      
      // Volume envelope for smooth sound
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.4);
      
      return Promise.resolve();
    } catch (error) {
      console.warn('Failed to create beep sound:', error);
      throw error;
    }
  }

  async play() {
    if (!this.isEnabled) {
      console.log('🔇 Notification sound disabled');
      return;
    }

    try {
      console.log('🔊 Playing enhanced notification sound');
      
      // Always use synthesized beep for reliability
      await this.createBeepSound();
      console.log('✅ Enhanced notification sound played successfully');
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
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

