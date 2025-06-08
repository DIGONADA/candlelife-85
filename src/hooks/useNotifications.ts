
import { useEffect, useCallback } from 'react';
import { notificationService } from '@/services/NotificationService';

export const useNotifications = () => {
  useEffect(() => {
    // Request permissions on mount
    notificationService.requestPermissions();
  }, []);

  const setUserInChat = useCallback((inChat: boolean, chatUserId?: string) => {
    notificationService.setUserInChat(inChat, chatUserId);
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    notificationService.setSoundEnabled(enabled);
  }, []);

  const requestPermissions = useCallback(async () => {
    return await notificationService.requestPermissions();
  }, []);

  const getPermissions = useCallback(() => {
    return notificationService.getPermissions();
  }, []);

  return {
    setUserInChat,
    setSoundEnabled,
    requestPermissions,
    getPermissions
  };
};
