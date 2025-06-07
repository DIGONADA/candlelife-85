
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Message, ChatUser } from '@/types/messages';

interface NotificationSystemConfig {
  soundEnabled?: boolean;
  pushEnabled?: boolean;
}

export const useNotificationSystem = (config: NotificationSystemConfig = {}) => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissions, setPermissions] = useState({
    sound: config.soundEnabled ?? true,
    push: config.pushEnabled ?? true,
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize the audio element
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3');
    audioRef.current.preload = 'auto';
  }, []);

  // Request notification permissions
  const requestPermissions = useCallback(async () => {
    if (!permissions.push) return true;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } else if (Notification.permission === 'granted') {
        return true;
      }
    }

    return false;
  }, [permissions.push]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (permissions.sound && audioRef.current) {
      audioRef.current.play().catch(error => {
        console.warn("Failed to play notification sound:", error);
      });
    }
  }, [permissions.sound]);

  // Show push notification
  const showPushNotification = useCallback((message: Message, senderInfo: ChatUser) => {
    if (!permissions.push) return;

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(`Nova mensagem de ${senderInfo.username}`, {
        body: message.content,
        icon: senderInfo.avatar_url || '/favicon.ico',
        badge: '/favicon.ico',
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => notification.close(), 5000);
    }
  }, [permissions.push]);

  // Handle new message
  const handleNewMessage = useCallback(async (message: Message, senderInfo: ChatUser) => {
    playNotificationSound();
    showPushNotification(message, senderInfo);
  }, [playNotificationSound, showPushNotification]);

  // Initialize the system
  useEffect(() => {
    if (user) {
      setIsInitialized(true);
    }
  }, [user]);

  return {
    isInitialized,
    requestPermissions,
    handleNewMessage,
  };
};
