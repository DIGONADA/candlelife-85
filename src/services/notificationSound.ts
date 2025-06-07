
class NotificationSoundService {
  private audio: HTMLAudioElement | null = null;
  private isEnabled = true;

  constructor() {
    this.initializeAudio();
  }

  private initializeAudio() {
    try {
      // Try to load the audio file
      this.audio = new Audio('/notification-sound.mp3');
      this.audio.preload = 'auto';
      this.audio.volume = 0.5;
    } catch (error) {
      console.warn('Failed to initialize notification sound:', error);
      // Fallback to a simple beep using Web Audio API
      this.createFallbackSound();
    }
  }

  private createFallbackSound() {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      this.audio = {
        play: () => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
          
          return Promise.resolve();
        }
      } as any;
    } catch (error) {
      console.warn('Failed to create fallback sound:', error);
    }
  }

  play() {
    if (!this.isEnabled || !this.audio) return;

    try {
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('Failed to play notification sound:', error);
        });
      }
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  isAudioEnabled() {
    return this.isEnabled;
  }
}

export const notificationSoundService = new NotificationSoundService();
