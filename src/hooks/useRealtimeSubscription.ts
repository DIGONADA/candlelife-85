
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
  const subscriptionIdRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (channelRef.current && isSubscribedRef.current) {
      console.log(`🧹 Cleaning up ${tableName} subscription`);
      try {
        const channel = channelRef.current;
        channel.unsubscribe();
        supabase.removeChannel(channel);
      } catch (error) {
        console.warn(`Warning during ${tableName} cleanup:`, error);
      } finally {
        channelRef.current = null;
        isSubscribedRef.current = false;
        subscriptionIdRef.current = null;
      }
    }
  }, [tableName]);

  useEffect(() => {
    if (!user?.id) {
      cleanup();
      return;
    }

    // Prevent duplicate subscriptions
    const currentSubscriptionId = `${tableName}_${user.id}`;
    if (isSubscribedRef.current && subscriptionIdRef.current === currentSubscriptionId) {
      return;
    }

    // Clean up any existing subscription first
    cleanup();

    console.log(`📢 Setting up ${tableName} realtime subscription`);

    const channelName = `${tableName}_${user.id}_${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Set up the subscription with proper error handling
    const subscription = channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: tableName,
      filter: `user_id=eq.${user.id}`
    }, (payload) => {
      console.log(`📢 ${tableName} change detected:`, payload);
      if (onDataChange) {
        onDataChange();
      }
      // Invalidate related queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes(tableName) || key?.includes('transactions') || key?.includes('expenses');
        }
      });
    });

    // Subscribe with proper status handling
    subscription.subscribe((status) => {
      console.log(`📡 ${tableName} realtime status:`, status);
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel;
        isSubscribedRef.current = true;
        subscriptionIdRef.current = currentSubscriptionId;
        console.log(`✅ ${tableName} realtime subscription active`);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        console.log(`❌ ${tableName} subscription error/closed:`, status);
        cleanup();
      }
    });

    return cleanup;
  }, [user?.id, tableName, onDataChange, cleanup, queryClient, ...dependencies]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isSubscribed: isSubscribedRef.current,
    cleanup
  };
};
