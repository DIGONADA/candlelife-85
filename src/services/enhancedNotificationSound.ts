
class EnhancedNotificationSoundService {
  private audio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private isEnabled = true;
  private isInitialized = false;

  constructor() {
    this.initializeAudio();
  }

  private async initializeAudio() {
    try {
      // Criar contexto de áudio para melhor compatibilidade mobile
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Tentar carregar o arquivo de áudio
      this.audio = new Audio('/notification-sound.mp3');
      this.audio.preload = 'auto';
      this.audio.volume = 0.7;
      
      // Para mobile, precisamos de interação do usuário primeiro
      this.setupMobileAudioUnlock();
      
      this.isInitialized = true;
      console.log('🔊 Enhanced notification sound service initialized');
    } catch (error) {
      console.warn('Failed to initialize enhanced notification sound:', error);
      this.createFallbackSound();
    }
  }

  private setupMobileAudioUnlock() {
    const unlockAudio = () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          console.log('🔊 Audio context resumed for mobile');
        });
      }
      
      // Preparar o áudio para reprodução
      if (this.audio) {
        this.audio.play().then(() => {
          this.audio!.pause();
          this.audio!.currentTime = 0;
          console.log('🔊 Audio unlocked for mobile');
        }).catch(() => {
          // Silenciosamente ignorar erro se o usuário ainda não interagiu
        });
      }
      
      // Remover listeners após primeira interação
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };

    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('click', unlockAudio, { once: true });
  }

  private createFallbackSound() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      this.audio = {
        play: () => {
          const oscillator = this.audioContext!.createOscillator();
          const gainNode = this.audioContext!.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(this.audioContext!.destination);
          
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, this.audioContext!.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.5);
          
          oscillator.start(this.audioContext!.currentTime);
          oscillator.stop(this.audioContext!.currentTime + 0.5);
          
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
      // Garantir que o contexto de áudio está ativo
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      console.log('🔊 Playing notification sound');
      const playPromise = this.audio.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        console.log('✅ Notification sound played successfully');
      }
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
      // Tentar fallback se falhar
      this.createFallbackSound();
      if (this.audio) {
        try {
          await this.audio.play();
        } catch (fallbackError) {
          console.warn('Fallback sound also failed:', fallbackError);
        }
      }
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    console.log(`🔊 Notification sound ${enabled ? 'enabled' : 'disabled'}`);
  }

  isAudioEnabled() {
    return this.isEnabled;
  }

  // Método para testar o som
  async testSound() {
    console.log('🧪 Testing notification sound');
    await this.play();
  }
}

export const enhancedNotificationSoundService = new EnhancedNotificationSoundService();
