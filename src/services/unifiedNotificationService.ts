import { Message, ChatUser } from '@/types/messages';

export interface UnifiedNotificationData {
  id: string;
  type: 'message' | 'transaction' | 'goal' | 'system' | 'social';
  title: string;
  body: string;
  avatar?: string;
  timestamp: string;
  read: boolean;
  conversationId?: string;
  userId?: string;
  data?: any;
}

type NotificationListener = (notifications: UnifiedNotificationData[]) => void;

class UnifiedNotificationService {
  private notifications: UnifiedNotificationData[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private soundEnabled = true;
  private pushEnabled = true;

  constructor() {
    this.loadFromStorage();
    this.requestPermissions();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('unified_notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading notifications from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('unified_notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications to storage:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    listener([...this.notifications]);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  addNotification(notification: Omit<UnifiedNotificationData, 'id' | 'timestamp' | 'read'>) {
    const newNotification: UnifiedNotificationData = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    this.notifications.unshift(newNotification);
    
    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    this.saveToStorage();
    this.notifyListeners();
    this.showSystemNotification(newNotification);
    this.playSound();
  }

  addMessageNotification(message: Message, senderInfo: ChatUser) {
    this.addNotification({
      type: 'message',
      title: `Nova mensagem de ${senderInfo.username}`,
      body: message.content,
      avatar: senderInfo.avatar_url,
      conversationId: senderInfo.id,
      userId: message.sender_id,
      data: { messageId: message.id }
    });
  }

  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  markAllAsRead() {
    let hasChanges = false;
    this.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  removeNotification(notificationId: string) {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  clearAll() {
    if (this.notifications.length > 0) {
      this.notifications = [];
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  getNotifications(): UnifiedNotificationData[] {
    return [...this.notifications];
  }

  private async requestPermissions() {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (error) {
        console.warn('Failed to request notification permission:', error);
      }
    }
  }

  private showSystemNotification(notification: UnifiedNotificationData) {
    if (!this.pushEnabled) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const systemNotification = new Notification(notification.title, {
          body: notification.body,
          icon: notification.avatar || '/favicon.ico',
          badge: '/favicon.ico',
          tag: notification.type,
        });

        systemNotification.onclick = () => {
          window.focus();
          systemNotification.close();
        };

        setTimeout(() => systemNotification.close(), 5000);
      } catch (error) {
        console.warn('Failed to show system notification:', error);
      }
    }
  }

  private playSound() {
    if (!this.soundEnabled) return;

    try {
      // Criar elemento de áudio dinamicamente
      const audio = document.createElement('audio');
      audio.preload = 'auto';
      
      // Tentar diferentes formatos de som
      const soundSources = [
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaAjiR2O7RfSkFJG7A7+CVSA0PV6zn77BdGQU+ltryxnkpBSl+zPLaizsIGGS57eOYTgwOUarm7blmGgU5k9n1unEiBC13yO/eizELIWmy5eyhUQ0QXbXr6b1mHggx...' // Som de notificação simples em base64
      ];
      
      audio.src = soundSources[0];
      audio.volume = 0.3;
      
      // Tocar o som
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('Failed to play notification sound:', error);
        });
      }
    } catch (error) {
      console.warn('Failed to create notification sound:', error);
    }
  }

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  setPushEnabled(enabled: boolean) {
    this.pushEnabled = enabled;
  }
}

export const unifiedNotificationService = new UnifiedNotificationService();
