
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

  // Enhanced presence update with better error handling
  const updatePresence = useCallback(async (
    status: 'online' | 'offline' | 'away' | 'typing',
    currentConversation?: string
  ) => {
    if (!user) return;

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

  // Load initial presence data
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

    // Enhanced heartbeat - every 25 seconds to be more responsive
    const heartbeat = setInterval(() => {
      updatePresence('online');
    }, 25000);

    // Real-time subscription for presence changes
    const presenceChannel = supabase
      .channel('enhanced_user_presence')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_presence'
      }, (payload) => {
        console.log('📡 Presence change detected:', payload);
        
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
        console.log('📡 Enhanced presence subscription status:', status);
      });

    // Enhanced visibility change handling
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away');
      } else {
        updatePresence('online');
      }
    };

    // Enhanced beforeunload handling
    const handleBeforeUnload = () => {
      // Use sendBeacon for better reliability on page unload
      if (navigator.sendBeacon) {
        const data = new FormData();
        data.append('user_id', user.id);
        data.append('status', 'offline');
        // This would need a server endpoint to handle the beacon
      } else {
        updatePresence('offline');
      }
    };

    // Enhanced focus/blur handling for better presence detection
    const handleFocus = () => updatePresence('online');
    const handleBlur = () => updatePresence('away');

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

  // Enhanced status checking with smart offline detection
  const getUserStatus = useCallback((userId: string): 'online' | 'offline' | 'away' | 'typing' => {
    const presence = userStatuses.get(userId);
    if (!presence) return 'offline';

    // More aggressive offline detection - 90 seconds instead of 2 minutes
    const lastSeen = new Date(presence.last_seen);
    const now = new Date();
    const diffSeconds = (now.getTime() - lastSeen.getTime()) / 1000;

    if (diffSeconds > 90) return 'offline';
    return presence.status;
  }, [userStatuses]);

  const isUserOnline = useCallback((userId: string): boolean => {
    const status = getUserStatus(userId);
    return status === 'online' || status === 'typing';
  }, [getUserStatus]);

  const isUserTyping = useCallback((userId: string, conversationId?: string): boolean => {
    const presence = userStatuses.get(userId);
    if (!presence || presence.status !== 'typing') return false;
    
    // Check if typing in the specific conversation
    if (conversationId) {
      return presence.current_conversation === conversationId;
    }
    
    return true;
  }, [userStatuses]);

  const getLastSeen = useCallback((userId: string): string | undefined => {
    const presence = userStatuses.get(userId);
    return presence?.last_seen;
  }, [userStatuses]);

  // Enhanced method to update typing status
  const setTypingStatus = useCallback(async (isTyping: boolean, conversationId?: string) => {
    if (isTyping) {
      await updatePresence('typing', conversationId);
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
