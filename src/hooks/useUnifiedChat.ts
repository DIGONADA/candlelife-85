
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from './use-toast';
import { messageKeys } from '@/lib/query-keys';
import { unifiedNotificationService } from '@/services/unifiedNotificationService';
import { enhancedNotificationSoundService } from '@/services/enhancedNotificationSound';
import { 
  Message, 
  ChatUser, 
  MessageStatus,
  MessageType
} from '@/types/messages';

// Singleton class to manage global subscription state
class UnifiedChatSubscriptionManager {
  private static instance: UnifiedChatSubscriptionManager;
  private channel: any = null;
  private currentUserId: string | null = null;
  private isActive = false;
  private subscribers = new Set<string>();
  private queryClient: any = null;

  private constructor() {}

  static getInstance(): UnifiedChatSubscriptionManager {
    if (!UnifiedChatSubscriptionManager.instance) {
      UnifiedChatSubscriptionManager.instance = new UnifiedChatSubscriptionManager();
    }
    return UnifiedChatSubscriptionManager.instance;
  }

  subscribe(userId: string, queryClient: any): boolean {
    console.log('🔄 Attempting to subscribe:', { userId, currentUserId: this.currentUserId, isActive: this.isActive });
    
    this.queryClient = queryClient;
    const subscriberId = `${userId}_${Date.now()}_${Math.random()}`;
    this.subscribers.add(subscriberId);

    // If already active for the same user, just return true
    if (this.isActive && this.currentUserId === userId && this.channel) {
      console.log('🔄 Subscription already active for user, reusing');
      return true;
    }

    // Clean up any existing subscription
    this.cleanup();

    try {
      console.log('🔄 Creating new subscription for user:', userId);
      
      // Create unique channel name
      const channelName = `unified_chat_${userId}_${Date.now()}`;
      this.channel = supabase.channel(channelName);
      this.currentUserId = userId;

      // Add postgres changes listener
      this.channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`
      }, this.handleMessage.bind(this));

      // Subscribe with proper status handling
      this.channel.subscribe((status: string) => {
        console.log('📡 Unified chat status:', status);
        if (status === 'SUBSCRIBED') {
          this.isActive = true;
          console.log('✅ Unified chat connected successfully');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('❌ Unified chat connection closed or error:', status);
          this.isActive = false;
        }
      });

      return true;
    } catch (error) {
      console.error('Error creating subscription:', error);
      this.cleanup();
      return false;
    }
  }

  unsubscribe(userId: string): void {
    // Only cleanup if this is the last subscriber for this user
    const userSubscribers = Array.from(this.subscribers).filter(id => id.startsWith(userId));
    if (userSubscribers.length <= 1) {
      console.log('🧹 Last subscriber, cleaning up');
      this.cleanup();
    }
  }

  private async handleMessage(payload: any) {
    console.log('📨 New message received:', payload);
    const newMessage = payload.new as Message;
    
    try {
      // Get sender info
      const { data: senderData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', newMessage.sender_id)
        .single();

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

        // Play enhanced notification sound
        console.log('🔊 Playing enhanced notification sound');
        await enhancedNotificationSoundService.play();

        // Add notification to unified system
        unifiedNotificationService.addMessageNotification(newMessage, senderInfo);

        // Invalidate queries to refresh UI
        if (this.queryClient) {
          this.queryClient.invalidateQueries({ queryKey: messageKeys.chatUsers() });
          this.queryClient.invalidateQueries({ queryKey: messageKeys.conversation(newMessage.sender_id) });
        }
      }
    } catch (error) {
      console.error('Error processing new message:', error);
    }
  }

  private cleanup(): void {
    if (this.channel) {
      console.log('🧹 Cleaning up unified chat subscription');
      try {
        if (typeof this.channel.unsubscribe === 'function') {
          this.channel.unsubscribe();
        }
        if (supabase && typeof supabase.removeChannel === 'function') {
          supabase.removeChannel(this.channel);
        }
      } catch (error) {
        console.warn('Warning during unified chat cleanup:', error);
      }
    }
    
    this.channel = null;
    this.currentUserId = null;
    this.isActive = false;
    this.subscribers.clear();
  }

  getConnectionStatus(): { isConnected: boolean; userId: string | null } {
    return {
      isConnected: this.isActive,
      userId: this.currentUserId
    };
  }
}

export const useUnifiedChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const subscriptionManager = useRef(UnifiedChatSubscriptionManager.getInstance());

  // Setup unified chat system
  useEffect(() => {
    if (!user?.id) {
      setIsConnected(false);
      return;
    }

    console.log('🔄 Setting up unified chat system for user:', user.id);
    
    const success = subscriptionManager.current.subscribe(user.id, queryClient);
    setIsConnected(success);

    // Check connection status periodically
    const statusInterval = setInterval(() => {
      const status = subscriptionManager.current.getConnectionStatus();
      setIsConnected(status.isConnected && status.userId === user.id);
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      subscriptionManager.current.unsubscribe(user.id);
    };
  }, [user?.id, queryClient]);

  // Get chat users
  const useChatUsers = () => {
    return useQuery({
      queryKey: messageKeys.chatUsers(),
      queryFn: async (): Promise<ChatUser[]> => {
        if (!user?.id) return [];

        console.log('🔍 Fetching chat users for:', user.id);

        try {
          const { data: messages, error } = await supabase
            .from('messages')
            .select('sender_id, recipient_id, content, created_at, read')
            .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('❌ Error fetching messages:', error);
            throw error;
          }

          const userIds = new Set<string>();
          messages?.forEach((msg: any) => {
            if (msg.sender_id !== user.id) userIds.add(msg.sender_id);
            if (msg.recipient_id !== user.id) userIds.add(msg.recipient_id);
          });

          if (userIds.size === 0) return [];

          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, created_at, updated_at')
            .in('id', Array.from(userIds));

          if (profileError) {
            console.error('❌ Error fetching profiles:', profileError);
            throw profileError;
          }

          const chatUsers: ChatUser[] = await Promise.all(
            (profiles || []).map(async (profile: any) => {
              const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('recipient_id', user.id)
                .eq('sender_id', profile.id)
                .eq('read', false);

              const { data: lastMessageData } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${user.id},recipient_id.eq.${profile.id}),and(sender_id.eq.${profile.id},recipient_id.eq.${user.id})`)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              const lastMessage: Message | undefined = lastMessageData ? {
                id: lastMessageData.id,
                content: lastMessageData.content,
                sender_id: lastMessageData.sender_id,
                recipient_id: lastMessageData.recipient_id,
                created_at: lastMessageData.created_at,
                read: lastMessageData.read || false,
                message_status: (lastMessageData.message_status as MessageStatus) || MessageStatus.SENT,
                message_type: MessageType.TEXT,
                attachment_url: lastMessageData.attachment_url || undefined,
                deleted_by_recipient: lastMessageData.deleted_by_recipient || false,
                reactions: []
              } : undefined;

              return {
                id: profile.id,
                username: profile.username || 'Usuário',
                full_name: profile.username || undefined,
                avatar_url: profile.avatar_url || undefined,
                email: profile.username || undefined,
                created_at: profile.created_at || new Date().toISOString(),
                updated_at: profile.updated_at || new Date().toISOString(),
                unread_count: count || 0,
                last_message: lastMessage
              };
            })
          );

          console.log('✅ Fetched chat users:', chatUsers.length);
          return chatUsers;
        } catch (error) {
          console.error('❌ Error in chat users query:', error);
          throw error;
        }
      },
      enabled: !!user,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    });
  };

  // Get conversation messages
  const useConversation = (otherUserId: string, searchTerm?: string) => {
    return useQuery({
      queryKey: messageKeys.conversationWithSearch(otherUserId, searchTerm),
      queryFn: async (): Promise<Message[]> => {
        if (!user || !otherUserId) return [];

        console.log('🔍 Fetching conversation:', { otherUserId, searchTerm });

        try {
          let query = supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
            .order('created_at', { ascending: true });

          if (searchTerm) {
            query = query.ilike('content', `%${searchTerm}%`);
          }

          const { data, error } = await query;

          if (error) {
            console.error('❌ Error fetching conversation:', error);
            throw error;
          }

          const messages: Message[] = (data || []).map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            sender_id: msg.sender_id,
            recipient_id: msg.recipient_id,
            created_at: msg.created_at,
            read: msg.read || false,
            message_status: (msg.message_status as MessageStatus) || MessageStatus.SENT,
            message_type: MessageType.TEXT,
            attachment_url: msg.attachment_url || undefined,
            deleted_by_recipient: false,
            reactions: []
          }));

          console.log('✅ Fetched messages:', messages.length);
          return messages;
        } catch (error) {
          console.error('❌ Error in conversation query:', error);
          throw error;
        }
      },
      enabled: !!user && !!otherUserId,
      staleTime: 0,
      refetchOnWindowFocus: false,
    });
  };

  // Send message
  const useSendMessage = () => useMutation({
    mutationFn: async ({ 
      recipientId, 
      content, 
      attachment
    }: { 
      recipientId: string; 
      content: string; 
      attachment?: File;
    }) => {
      if (!user) throw new Error('User not authenticated');

      console.log('📤 Sending message:', { recipientId, content: content.substring(0, 50) + '...' });

      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          content,
          message_status: 'sent'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error sending message:', error);
        throw error;
      }

      console.log('✅ Message sent successfully:', data.id);
      return data;
    },
    onSuccess: (data) => {
      console.log('📤 Message sent, invalidating queries');
      queryClient.invalidateQueries({ queryKey: messageKeys.chatUsers() });
      queryClient.invalidateQueries({ queryKey: messageKeys.conversation(data.recipient_id) });
    },
    onError: (error) => {
      console.error('❌ Send message error:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Mark conversation as read
  const useMarkAsRead = () => useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user) throw new Error('User not authenticated');

      console.log('📖 Marking conversation as read with:', otherUserId);

      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('recipient_id', user.id)
        .eq('sender_id', otherUserId)
        .eq('read', false);

      if (error) {
        console.error('❌ Error marking as read:', error);
        throw error;
      }

      console.log('✅ Conversation marked as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.chatUsers() });
    }
  });

  // Clear conversation
  const useClearConversation = () => useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user) throw new Error('User not authenticated');

      console.log('🗑️ Clearing conversation with:', otherUserId);

      const { error } = await supabase.rpc('clear_conversation', {
        p_user_id: user.id,
        p_other_user_id: otherUserId
      });

      if (error) {
        console.error('❌ Error clearing conversation:', error);
        throw error;
      }

      console.log('✅ Conversation cleared');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.chatUsers() });
    }
  });

  // Delete conversation
  const useDeleteConversation = () => useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user) throw new Error('User not authenticated');

      console.log('🗑️ Deleting conversation with:', otherUserId);

      const { error } = await supabase
        .from('messages')
        .delete()
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`);

      if (error) {
        console.error('❌ Error deleting conversation:', error);
        throw error;
      }

      console.log('✅ Conversation deleted');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.chatUsers() });
    }
  });

  // Get total unread count
  const getTotalUnreadCount = useCallback(() => {
    const chatUsersQuery = useChatUsers();
    const chatUsers = chatUsersQuery.data || [];
    return chatUsers.reduce((total, user) => total + user.unread_count, 0);
  }, []);

  const cleanup = useCallback(() => {
    if (user?.id) {
      subscriptionManager.current.unsubscribe(user.id);
    }
  }, [user?.id]);

  return {
    isConnected,
    activeConversation,
    setActiveConversation,
    useChatUsers,
    useConversation,
    useSendMessage,
    useMarkAsRead,
    useClearConversation,
    useDeleteConversation,
    getTotalUnreadCount,
    cleanup
  };
};
