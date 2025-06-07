
import { supabase } from '@/integrations/supabase/client';
import { messageKeys } from '@/lib/query-keys';
import { unifiedNotificationService } from '@/services/unifiedNotificationService';
import { enhancedNotificationSoundService } from '@/services/enhancedNotificationSound';
import { Message, ChatUser } from '@/types/messages';

class ChatSubscriptionManager {
  private static instance: ChatSubscriptionManager | null = null;
  private channel: any = null;
  private isActive = false;
  private currentUserId: string | null = null;
  private queryClient: any = null;
  private subscriberCount = 0;
  private cleanupTimeout: any = null;
  private debounceTimeout: any = null;
  private lastSubscriptionTime = 0;

  static getInstance(): ChatSubscriptionManager {
    if (!ChatSubscriptionManager.instance) {
      ChatSubscriptionManager.instance = new ChatSubscriptionManager();
    }
    return ChatSubscriptionManager.instance;
  }

  setQueryClient(client: any) {
    this.queryClient = client;
  }

  subscribe(userId: string): boolean {
    // Prevent rapid re-subscriptions
    const now = Date.now();
    if (now - this.lastSubscriptionTime < 1000) {
      console.log('🔄 Subscription debounced, too soon after last attempt');
      return false;
    }
    this.lastSubscriptionTime = now;

    console.log('🔄 ChatSubscriptionManager: subscribe called for user:', userId);
    
    this.subscriberCount++;
    
    // If already subscribed for this user, just increment counter
    if (this.isActive && this.currentUserId === userId && this.channel) {
      console.log('✅ Already subscribed for this user, incrementing counter');
      return true;
    }

    // Clean up any existing subscription
    this.cleanup();

    // Clear any pending cleanup
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }

    // Debounce subscription creation
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(() => {
      this.createSubscription(userId);
    }, 100);

    return true;
  }

  private createSubscription(userId: string) {
    try {
      console.log('🔄 Creating new subscription for user:', userId);
      
      const channelName = `chat_${userId}_${Date.now()}`;
      this.channel = supabase.channel(channelName);
      this.currentUserId = userId;

      // Add postgres changes listener
      this.channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`
      }, this.handleMessage.bind(this));

      // Subscribe with status handling
      this.channel.subscribe((status: string) => {
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          this.isActive = true;
          console.log('✅ Chat subscription active');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('❌ Subscription error:', status);
          this.isActive = false;
        }
      });

    } catch (error) {
      console.error('❌ Error creating subscription:', error);
      this.cleanup();
    }
  }

  unsubscribe(): void {
    console.log('🔄 ChatSubscriptionManager: unsubscribe called');
    
    this.subscriberCount = Math.max(0, this.subscriberCount - 1);
    
    // Only cleanup if no more subscribers
    if (this.subscriberCount === 0) {
      console.log('🔄 No more subscribers, scheduling cleanup');
      
      // Delay cleanup to prevent immediate re-subscription issues
      this.cleanupTimeout = setTimeout(() => {
        if (this.subscriberCount === 0) {
          this.cleanup();
        }
      }, 2000);
    }
  }

  private async handleMessage(payload: any) {
    console.log('📨 New message received:', payload);
    const newMessage = payload.new as Message;
    
    try {
      // Get sender info with error handling
      const { data: senderData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', newMessage.sender_id)
        .single();

      if (error) {
        console.warn('⚠️ Could not fetch sender profile:', error);
        return;
      }

      if (senderData) {
        const senderInfo: ChatUser = {
          id: senderData.id,
          username: senderData.username || 'Usuário',
          full_name: senderData.username || undefined,
          avatar_url: senderData.avatar_url || undefined,
          email: senderData.username || undefined,
          created_at: senderData.created_at,
          updated_at: senderData.updated_at,
          unread_count: 0
        };

        // Play notification sound (with error handling)
        try {
          await enhancedNotificationSoundService.play();
        } catch (soundError) {
          console.warn('⚠️ Could not play notification sound:', soundError);
        }

        // Add notification
        unifiedNotificationService.addMessageNotification(newMessage, senderInfo);

        // Invalidate queries with debounce
        if (this.queryClient) {
          clearTimeout(this.debounceTimeout);
          this.debounceTimeout = setTimeout(() => {
            this.queryClient.invalidateQueries({ queryKey: messageKeys.chatUsers() });
            this.queryClient.invalidateQueries({ queryKey: messageKeys.conversation(newMessage.sender_id) });
          }, 300);
        }
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
    }
  }

  private cleanup() {
    if (this.channel) {
      console.log('🧹 Cleaning up chat subscription');
      try {
        this.channel.unsubscribe();
        supabase.removeChannel(this.channel);
      } catch (error) {
        console.warn('Warning during cleanup:', error);
      }
    }
    
    this.channel = null;
    this.currentUserId = null;
    this.isActive = false;
    
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
  }

  isConnected(): boolean {
    return this.isActive && this.channel !== null;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  forceCleanup() {
    console.log('🚨 Force cleanup called');
    this.subscriberCount = 0;
    this.cleanup();
  }
}

export const chatSubscriptionManager = ChatSubscriptionManager.getInstance();
