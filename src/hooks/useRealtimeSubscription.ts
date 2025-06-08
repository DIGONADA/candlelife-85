
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface SubscriptionConfig {
  tableName: string;
  onDataChange?: () => void;
  dependencies?: any[];
}

// Global map to track active subscriptions with their status
const activeSubscriptions = new Map<string, { 
  channel: any; 
  subscribers: number; 
  isSubscribed: boolean;
  isSubscribing: boolean;
}>();

export const useRealtimeSubscription = ({
  tableName,
  onDataChange,
  dependencies = []
}: SubscriptionConfig) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const subscriptionKeyRef = useRef<string | null>(null);
  const isActiveRef = useRef(false);

  const cleanup = useCallback(() => {
    if (subscriptionKeyRef.current && isActiveRef.current) {
      const key = subscriptionKeyRef.current;
      const subscription = activeSubscriptions.get(key);
      
      if (subscription) {
        subscription.subscribers--;
        console.log(`🔄 Decreasing subscribers for ${key}: ${subscription.subscribers}`);
        
        if (subscription.subscribers <= 0) {
          console.log(`🧹 Cleaning up subscription for ${key}`);
          try {
            if (subscription.isSubscribed) {
              subscription.channel.unsubscribe();
              supabase.removeChannel(subscription.channel);
            }
          } catch (error) {
            console.warn(`Warning during ${key} cleanup:`, error);
          }
          activeSubscriptions.delete(key);
        }
      }
      
      isActiveRef.current = false;
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
      isActiveRef.current = true;
      console.log(`📢 Reusing existing ${tableName} subscription, subscribers: ${subscription.subscribers}`);
      return cleanup;
    }

    // Prevent concurrent subscription attempts
    const existingSub = activeSubscriptions.get(subscriptionKey);
    if (existingSub?.isSubscribing) {
      console.log(`⏳ ${tableName} subscription already in progress, skipping`);
      return cleanup;
    }

    // Create new subscription
    console.log(`📢 Creating new ${tableName} realtime subscription`);

    const channelName = `${tableName}_${user.id}_${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Store subscription info immediately to prevent duplicates
    activeSubscriptions.set(subscriptionKey, {
      channel,
      subscribers: 1,
      isSubscribed: false,
      isSubscribing: true
    });

    isActiveRef.current = true;

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
      const currentSub = activeSubscriptions.get(subscriptionKey);
      
      if (!currentSub) return;

      if (status === 'SUBSCRIBED') {
        currentSub.isSubscribed = true;
        currentSub.isSubscribing = false;
        console.log(`✅ ${tableName} realtime subscription active`);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.log(`❌ ${tableName} subscription error/closed:`, status);
        currentSub.isSubscribed = false;
        currentSub.isSubscribing = false;
        
        // Clean up failed subscription
        if (currentSub.subscribers <= 1) {
          activeSubscriptions.delete(subscriptionKey);
          isActiveRef.current = false;
        }
      }
    });

    return cleanup;
  }, [user?.id, tableName, onDataChange, cleanup, queryClient, ...dependencies]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const subscription = subscriptionKeyRef.current ? activeSubscriptions.get(subscriptionKeyRef.current) : null;
  
  return {
    isSubscribed: subscription?.isSubscribed || false,
    cleanup
  };
};
