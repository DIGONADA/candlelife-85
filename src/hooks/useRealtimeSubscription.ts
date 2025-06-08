
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface SubscriptionConfig {
  tableName: string;
  onDataChange?: () => void;
  dependencies?: any[];
}

// Global map to track active subscriptions
const activeSubscriptions = new Map<string, { channel: any; subscribers: number }>();

export const useRealtimeSubscription = ({
  tableName,
  onDataChange,
  dependencies = []
}: SubscriptionConfig) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const subscriptionKeyRef = useRef<string | null>(null);
  const isSubscribedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (subscriptionKeyRef.current && isSubscribedRef.current) {
      const key = subscriptionKeyRef.current;
      const subscription = activeSubscriptions.get(key);
      
      if (subscription) {
        subscription.subscribers--;
        console.log(`🔄 Decreasing subscribers for ${key}: ${subscription.subscribers}`);
        
        if (subscription.subscribers <= 0) {
          console.log(`🧹 Cleaning up subscription for ${key}`);
          try {
            subscription.channel.unsubscribe();
            supabase.removeChannel(subscription.channel);
          } catch (error) {
            console.warn(`Warning during ${key} cleanup:`, error);
          }
          activeSubscriptions.delete(key);
        }
      }
      
      isSubscribedRef.current = false;
      subscriptionKeyRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      cleanup();
      return;
    }

    const subscriptionKey = `${tableName}_${user.id}`;
    subscriptionKeyRef.current = subscriptionKey;

    // Check if subscription already exists
    let subscription = activeSubscriptions.get(subscriptionKey);
    
    if (subscription) {
      // Subscription exists, just increment subscriber count
      subscription.subscribers++;
      isSubscribedRef.current = true;
      console.log(`📢 Reusing existing ${tableName} subscription, subscribers: ${subscription.subscribers}`);
      return cleanup;
    }

    // Create new subscription
    console.log(`📢 Creating new ${tableName} realtime subscription`);

    const channelName = `${tableName}_${user.id}_${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Set up the subscription
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: tableName,
    }, (payload) => {
      console.log(`📢 ${tableName} change detected:`, payload);
      if (onDataChange) {
        onDataChange();
      }
      // Invalidate related queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes(tableName) || key?.includes('posts') || key?.includes('comments') || key?.includes('reactions');
        }
      });
    });

    // Subscribe and track status
    channel.subscribe((status) => {
      console.log(`📡 ${tableName} realtime status:`, status);
      if (status === 'SUBSCRIBED') {
        // Store subscription in global map
        activeSubscriptions.set(subscriptionKey, {
          channel,
          subscribers: 1
        });
        isSubscribedRef.current = true;
        console.log(`✅ ${tableName} realtime subscription active`);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        console.log(`❌ ${tableName} subscription error/closed:`, status);
        activeSubscriptions.delete(subscriptionKey);
        isSubscribedRef.current = false;
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
