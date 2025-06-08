
import { supabase } from '@/integrations/supabase/client';
import { messageKeys } from '@/lib/query-keys';
import { notificationService } from '@/services/NotificationService';
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
  private subscriptionPromise: Promise<void> | null = null;

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
    
    // If we're already subscribing for this user, just increment counter
    if (this.subscriptionPromise && this.currentUserId === userId) {
      this.subscriberCount++;
      console.log('⏳ Subscription in progress, incrementing counter');
      return true;
    }
    
    // If already subscribed for this user, just increment counter
    if (this.isActive && this.currentUserId === userId && this.channel && !this.isSubscribing) {
      this.subscriberCount++;
      console.log('✅ Already subscribed for this user, incrementing counter');
      return true;
    }

    // Start new subscription
    this.subscriberCount++;
    this.subscriptionPromise = this.createSubscriptionSafely(userId);
    return true;
  }

  private async createSubscriptionSafely(userId: string): Promise<void> {
    // Prevent concurrent subscriptions
    if (this.isSubscribing) {
      console.log('⏳ Already creating subscription, waiting...');
      return;
    }

    this.isSubscribing = true;
    
    try {
      // Force cleanup any existing subscription
      await this.forceCleanupInternal();

      // Clear any pending cleanup
      if (this.cleanupTimeout) {
        clearTimeout(this.cleanupTimeout);
        this.cleanupTimeout = null;
      }

      console.log('🔄 Creating new subscription for user:', userId);
      
      // Generate unique channel name
      this.channelName = `chat_messages_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.currentUserId = userId;

      // Create new channel
      this.channel = supabase.channel(this.channelName);

      // Add postgres changes listener
      this.channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`
      }, this.handleMessage.bind(this));

      // Subscribe with promise-based handling
      const subscriptionPromise = new Promise<void>((resolve, reject) => {
        let resolved = false;
        
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            reject(new Error('Subscription timeout'));
          }
        }, 10000); // 10 second timeout

        this.channel.subscribe((status: string) => {
          console.log('📡 Subscription status:', status, 'for channel:', this.channelName);
          
          if (resolved) return;
          
          if (status === 'SUBSCRIBED') {
            resolved = true;
            clearTimeout(timeout);
            this.isActive = true;
            this.isSubscribing = false;
            console.log('✅ Chat subscription active for channel:', this.channelName);
            resolve();
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            resolved = true;
            clearTimeout(timeout);
            console.log('❌ Subscription error:', status, 'for channel:', this.channelName);
            this.isActive = false;
            this.isSubscribing = false;
            
            // Only cleanup if this is our current channel
            if (this.channel && this.channel.topic === this.channelName) {
              this.channel = null;
              this.channelName = null;
            }
            reject(new Error(`Subscription failed: ${status}`));
          }
        });
      });

      await subscriptionPromise;

    } catch (error) {
      console.error('❌ Error creating subscription:', error);
      this.isSubscribing = false;
      this.isActive = false;
      await this.forceCleanupInternal();
      throw error;
    } finally {
      this.subscriptionPromise = null;
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

        // Use new notification service
        await notificationService.handleNewMessage(newMessage, senderInfo);

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
    this.forceCleanupInternal();
  }

  private async forceCleanupInternal() {
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
    this.subscriptionPromise = null;
    
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
