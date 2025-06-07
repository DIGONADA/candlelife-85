
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

interface SubscriptionConfig {
  channelName: string;
  onSubscriptionChange?: (payload: any) => void;
  filters?: Array<{
    event: string;
    schema?: string;
    table?: string;
    filter?: string;
  }>;
  dependencies?: any[];
}

export const useRealtimeSubscription = ({
  channelName,
  onSubscriptionChange,
  filters = [],
  dependencies = []
}: SubscriptionConfig) => {
  const { user } = useAuth();
  
  // This hook is deprecated and should not be used anymore
  // Return empty cleanup function to prevent conflicts
  const cleanupSubscription = useCallback(() => {
    console.warn(`🛑 useRealtimeSubscription is deprecated for: ${channelName}. Use direct supabase.channel() instead.`);
  }, [channelName]);

  // Effect that does nothing but logs deprecation warning
  useEffect(() => {
    console.warn(`⚠️ useRealtimeSubscription is deprecated for ${channelName}. Use direct supabase.channel() instead.`);
    
    return cleanupSubscription;
  }, [user?.id, cleanupSubscription, ...dependencies]);

  return {
    isSubscribed: false,
    cleanup: cleanupSubscription
  };
};
