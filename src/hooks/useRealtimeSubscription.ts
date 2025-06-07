
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface SubscriptionConfig {
  tableName: string;
  onDataChange?: () => void;
  dependencies?: any[];
}

export const useRealtimeSubscription = ({
  tableName,
  onDataChange,
  dependencies = []
}: SubscriptionConfig) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (channelRef.current && isSubscribedRef.current) {
      console.log(`🧹 Cleaning up ${tableName} subscription`);
      try {
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.warn('Warning during cleanup:', error);
      } finally {
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
    }
  }, [tableName]);

  useEffect(() => {
    if (!user?.id || isSubscribedRef.current) return;

    cleanup();

    console.log(`📢 Setting up ${tableName} realtime subscription`);

    const channelName = `${tableName}_${user.id}_${Date.now()}`;
    const channel = supabase.channel(channelName);

    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: tableName,
      filter: `user_id=eq.${user.id}`
    }, () => {
      console.log(`📢 ${tableName} change detected`);
      if (onDataChange) {
        onDataChange();
      }
      // Invalidate all related queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes(tableName) || key?.includes('transactions') || key?.includes('expenses');
        }
      });
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel;
        isSubscribedRef.current = true;
        console.log(`✅ ${tableName} realtime subscription active`);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        isSubscribedRef.current = false;
        console.log(`❌ ${tableName} subscription error/closed`);
      }
    });

    return cleanup;
  }, [user?.id, tableName, onDataChange, cleanup, queryClient, ...dependencies]);

  return {
    isSubscribed: isSubscribedRef.current,
    cleanup
  };
};
