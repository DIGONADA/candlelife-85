
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface EnhancedUserPresence {
  user_id: string;
  status: 'online' | 'offline' | 'away' | 'typing';
  last_seen: string;
  current_conversation?: string;
}

export const useEnhancedUserPresence = () => {
  const { user } = useAuth();
  const [userStatuses, setUserStatuses] = useState<Map<string, EnhancedUserPresence>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);

  // Enhanced presence update with better error handling and immediate UI feedback
  const updatePresence = useCallback(async (
    status: 'online' | 'offline' | 'away' | 'typing',
    currentConversation?: string
  ) => {
    if (!user) return;

    // Immediate local update for better UX
    setUserStatuses(prev => {
      const newMap = new Map(prev);
      newMap.set(user.id, {
        user_id: user.id,
        status,
        last_seen: new Date().toISOString(),
        current_conversation: currentConversation || undefined
      });
      return newMap;
    });

    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          status,
          last_seen: new Date().toISOString(),
          current_conversation: currentConversation || null
        });

      if (error) {
        console.warn('Failed to update presence:', error);
      }
    } catch (error) {
      console.warn('Error updating presence:', error);
    }
  }, [user]);

  // Load initial presence data with better error handling
  useEffect(() => {
    if (!user) return;

    const loadInitialPresence = async () => {
      try {
        const { data, error } = await supabase
          .from('user_presence')
          .select('*');

        if (error) {
          console.warn('Error loading initial presence:', error);
          return;
        }

        if (data) {
          const statusMap = new Map();
          data.forEach((presence) => {
            statusMap.set(presence.user_id, presence);
          });
          setUserStatuses(statusMap);
        }
      } catch (error) {
        console.warn('Error in loadInitialPresence:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadInitialPresence();
  }, [user]);

  useEffect(() => {
    if (!user || !isInitialized) return;

    // Set initial online status
    updatePresence('online');

    // More frequent heartbeat for better real-time experience (20 seconds)
    const heartbeat = setInterval(() => {
      updatePresence('online');
    }, 20000);

    // Enhanced real-time subscription with better error handling
    const presenceChannel = supabase
      .channel('enhanced_user_presence')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_presence'
      }, (payload) => {
        console.log('📡 Real-time presence update:', payload);
        
        if (payload.eventType === 'DELETE') {
          setUserStatuses(prev => {
            const newMap = new Map(prev);
            newMap.delete(payload.old.user_id);
            return newMap;
          });
        } else {
          const presence = payload.new as EnhancedUserPresence;
          setUserStatuses(prev => {
            const newMap = new Map(prev);
            newMap.set(presence.user_id, presence);
            return newMap;
          });
        }
      })
      .subscribe((status) => {
        console.log('📡 Presence subscription status:', status);
      });

    // Enhanced visibility and focus handling for better presence detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away');
      } else {
        updatePresence('online');
      }
    };

    const handleBeforeUnload = () => {
      // Sync call for immediate offline status
      navigator.sendBeacon && navigator.sendBeacon('/api/presence/offline') || updatePresence('offline');
    };

    const handleFocus = () => updatePresence('online');
    const handleBlur = () => updatePresence('away');

    // Enhanced event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      clearInterval(heartbeat);
      updatePresence('offline');
      supabase.removeChannel(presenceChannel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [user, updatePresence, isInitialized]);

  // More aggressive offline detection for better real-time status (60 seconds)
  const getUserStatus = useCallback((userId: string): 'online' | 'offline' | 'away' | 'typing' => {
    const presence = userStatuses.get(userId);
    if (!presence) return 'offline';

    const lastSeen = new Date(presence.last_seen);
    const now = new Date();
    const diffSeconds = (now.getTime() - lastSeen.getTime()) / 1000;

    if (diffSeconds > 60) return 'offline';
    return presence.status;
  }, [userStatuses]);

  const isUserOnline = useCallback((userId: string): boolean => {
    const status = getUserStatus(userId);
    return status === 'online' || status === 'typing';
  }, [getUserStatus]);

  const isUserTyping = useCallback((userId: string, conversationId?: string): boolean => {
    const presence = userStatuses.get(userId);
    if (!presence || presence.status !== 'typing') return false;
    
    if (conversationId) {
      return presence.current_conversation === conversationId;
    }
    
    return true;
  }, [userStatuses]);

  const getLastSeen = useCallback((userId: string): string | undefined => {
    const presence = userStatuses.get(userId);
    return presence?.last_seen;
  }, [userStatuses]);

  // Enhanced typing status with automatic reset
  const setTypingStatus = useCallback(async (isTyping: boolean, conversationId?: string) => {
    if (isTyping) {
      await updatePresence('typing', conversationId);
      // Auto-reset typing status after 3 seconds
      setTimeout(() => {
        updatePresence('online', conversationId);
      }, 3000);
    } else {
      await updatePresence('online', conversationId);
    }
  }, [updatePresence]);

  return {
    userStatuses,
    getUserStatus,
    isUserOnline,
    isUserTyping,
    getLastSeen,
    updateMyPresence: updatePresence,
    setTypingStatus,
    isInitialized
  };
};
