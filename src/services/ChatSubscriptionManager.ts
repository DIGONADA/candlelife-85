
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
  private isSubscribing = false;
  private channelName: string | null = null;

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
    console.log('🔄 ChatSubscriptionManager: subscribe called for user:', userId);
    
    // Prevent multiple concurrent subscriptions
    if (this.isSubscribing) {
      console.log('⏳ Already subscribing, skipping...');
      return false;
    }
    
    this.subscriberCount++;
    
    // If already subscribed for this user, just increment counter
    if (this.isActive && this.currentUserId === userId && this.channel) {
      console.log('✅ Already subscribed for this user, incrementing counter');
      return true;
    }

    // Clean up any existing subscription first
    this.forceCleanup();

    // Clear any pending cleanup
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }

    // Create new subscription
    this.createSubscription(userId);
    return true;
  }

  private createSubscription(userId: string) {
    if (this.isSubscribing) {
      return;
    }

    this.isSubscribing = true;
    
    try {
      console.log('🔄 Creating new subscription for user:', userId);
      
      // Generate unique channel name to avoid conflicts
      this.channelName = `chat_messages_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Make sure any existing channel is completely removed
      if (this.channel) {
        try {
          this.channel.unsubscribe();
          supabase.removeChannel(this.channel);
        } catch (error) {
          console.warn('Warning cleaning up old channel:', error);
        }
      }
      
      this.channel = supabase.channel(this.channelName);
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
        console.log('📡 Subscription status:', status, 'for channel:', this.channelName);
        if (status === 'SUBSCRIBED') {
          this.isActive = true;
          this.isSubscribing = false;
          console.log('✅ Chat subscription active for channel:', this.channelName);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('❌ Subscription error:', status, 'for channel:', this.channelName);
          this.isActive = false;
          this.isSubscribing = false;
          
          // Only cleanup if this is our current channel
          if (this.channel && this.channel.topic === this.channelName) {
            this.channel = null;
            this.channelName = null;
          }
        }
      });

    } catch (error) {
      console.error('❌ Error creating subscription:', error);
      this.isSubscribing = false;
      this.forceCleanup();
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
          this.forceCleanup();
        }
      }, 1000);
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

        // Invalidate queries
        if (this.queryClient) {
          this.queryClient.invalidateQueries({ queryKey: messageKeys.chatUsers() });
          this.queryClient.invalidateQueries({ queryKey: messageKeys.conversation(newMessage.sender_id) });
        }
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
    }
  }

  forceCleanup() {
    console.log('🧹 Force cleaning up chat subscription');
    
    if (this.channel) {
      try {
        console.log('🧹 Cleaning up channel:', this.channelName);
        // Properly unsubscribe and remove channel
        this.channel.unsubscribe();
        supabase.removeChannel(this.channel);
      } catch (error) {
        console.warn('Warning during cleanup:', error);
      }
    }
    
    this.channel = null;
    this.channelName = null;
    this.currentUserId = null;
    this.isActive = false;
    this.isSubscribing = false;
    this.subscriberCount = 0;
    
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
  }

  isConnected(): boolean {
    return this.isActive && this.channel !== null && !this.isSubscribing;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }
}

export const chatSubscriptionManager = ChatSubscriptionManager.getInstance();
