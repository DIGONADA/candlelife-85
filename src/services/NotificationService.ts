
import { Message, ChatUser } from '@/types/messages';

interface NotificationPermissions {
  notifications: boolean;
  sound: boolean;
}

class NotificationService {
  private static instance: NotificationService | null = null;
  private permissions: NotificationPermissions = {
    notifications: false,
    sound: true
  };
  private audioContext: AudioContext | null = null;
  private isUserInChat = false;
  private currentChatUserId: string | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  constructor() {
    this.initializeAudioContext();
    this.requestNotificationPermission();
  }

  private async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Setup mobile audio unlock
      const unlockAudio = async () => {
        if (this.audioContext && this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('click', unlockAudio);
      };

      document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
      document.addEventListener('click', unlockAudio, { once: true });
    } catch (error) {
      console.warn('Failed to initialize audio context:', error);
    }
  }

  private async requestNotificationPermission(): Promise<void> {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        this.permissions.notifications = permission === 'granted';
      } else {
        this.permissions.notifications = Notification.permission === 'granted';
      }
    }
  }

  setUserInChat(inChat: boolean, chatUserId?: string) {
    this.isUserInChat = inChat;
    this.currentChatUserId = chatUserId || null;
    console.log('🔔 User chat status:', { inChat, chatUserId });
  }

  setSoundEnabled(enabled: boolean) {
    this.permissions.sound = enabled;
  }

  private async playBeepSound(): Promise<void> {
    if (!this.permissions.sound || !this.audioContext) {
      console.log('🔇 Sound disabled or audio context not available');
      return;
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create a pleasant notification beep
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Configure the beep sound
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
      oscillator.type = 'sine';

      // Configure volume envelope
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.5);

      console.log('🔊 Beep sound played successfully');
    } catch (error) {
      console.warn('Failed to play beep sound:', error);
    }
  }

  private showSystemNotification(message: Message, senderInfo: ChatUser): void {
    if (!this.permissions.notifications) {
      console.log('🔕 System notifications not permitted');
      return;
    }

    try {
      // Truncate message content to 100 characters
      const messagePreview = message.content.length > 100 
        ? message.content.substring(0, 100) + '...'
        : message.content;

      const notification = new Notification(`Nova mensagem de ${senderInfo.username}`, {
        body: messagePreview,
        icon: senderInfo.avatar_url || '/favicon.ico',
        badge: '/favicon.ico',
        tag: `message-${message.sender_id}`,
        requireInteraction: false,
        silent: false,
        data: {
          senderId: message.sender_id,
          senderName: senderInfo.username,
          senderAvatar: senderInfo.avatar_url,
          messageId: message.id,
          messageContent: message.content
        }
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle click to focus window and open chat
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Navigate to the chat conversation
        const currentPath = window.location.pathname;
        const targetPath = `/chat/${message.sender_id}`;
        
        if (currentPath !== targetPath) {
          // Dispatch custom event to open chat
          const event = new CustomEvent('openChat', {
            detail: { 
              userId: message.sender_id,
              userName: senderInfo.username,
              userAvatar: senderInfo.avatar_url
            }
          });
          window.dispatchEvent(event);
        }
      };

      console.log('🔔 System notification shown for:', senderInfo.username);
    } catch (error) {
      console.warn('Failed to show system notification:', error);
    }
  }

  async handleNewMessage(message: Message, senderInfo: ChatUser): Promise<void> {
    console.log('🔔 Processing new message notification:', {
      sender: senderInfo.username,
      isUserInChat: this.isUserInChat,
      currentChatUserId: this.currentChatUserId,
      messageSenderId: message.sender_id,
      messagePreview: message.content.substring(0, 50) + '...'
    });

    // Check if user is in the specific chat with this sender
    const isInSenderChat = this.isUserInChat && this.currentChatUserId === message.sender_id;

    // Only notify if user is NOT in the chat with this specific sender
    if (!isInSenderChat) {
      console.log('🔔 User is outside chat, showing notification');
      
      // Play beep sound
      await this.playBeepSound();
      
      // Show system notification with detailed info
      this.showSystemNotification(message, senderInfo);
    } else {
      console.log('🔕 User is in chat with sender, skipping notification');
    }
  }

  async requestPermissions(): Promise<boolean> {
    await this.requestNotificationPermission();
    return this.permissions.notifications;
  }

  getPermissions(): NotificationPermissions {
    return { ...this.permissions };
  }
}

export const notificationService = NotificationService.getInstance();
