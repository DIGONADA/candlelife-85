
import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from './use-toast';
import { messageKeys } from '@/lib/query-keys';
import { unifiedNotificationService } from '@/services/unifiedNotificationService';
import { 
  Message, 
  ChatUser, 
  MessageStatus,
  MessageType
} from '@/types/messages';

export const useSimpleMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (channelRef.current && isSubscribedRef.current) {
      console.log('🧹 Cleaning up realtime subscription');
      try {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
        setIsConnected(false);
      } catch (error) {
        console.warn('Warning during cleanup:', error);
      }
    }
  }, []);

  // Setup realtime listener for new messages - only once per user
  useEffect(() => {
    if (!user?.id || isSubscribedRef.current) return;

    console.log('🔄 Setting up realtime for user:', user.id);

    // Create unique channel name to avoid conflicts
    const channelName = `messages_${user.id}_${Date.now()}`;
    const channel = supabase.channel(channelName);

    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `recipient_id=eq.${user.id}`
    }, async (payload) => {
      console.log('📨 New message received:', payload);
      const newMessage = payload.new as Message;
      
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

        // Add notification to unified system
        unifiedNotificationService.addMessageNotification(newMessage, senderInfo);
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: messageKeys.chatUsers() });
      queryClient.invalidateQueries({ queryKey: messageKeys.conversation(newMessage.sender_id) });
    });

    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log('📡 Realtime status:', status);
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        isSubscribedRef.current = true;
        console.log('✅ Realtime connected successfully');
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setIsConnected(false);
        isSubscribedRef.current = false;
        console.log('❌ Realtime connection closed or error');
      }
    });

    channelRef.current = channel;

    return cleanup;
  }, [user?.id, queryClient, cleanup]);

  // Get chat users
  const useChatUsers = () => {
    return useQuery({
      queryKey: messageKeys.chatUsers(),
      queryFn: async (): Promise<ChatUser[]> => {
        if (!user?.id) return [];

        console.log('🔍 Fetching chat users for:', user.id);

        try {
          // Get all messages involving the current user
          const { data: messages, error } = await supabase
            .from('messages')
            .select('sender_id, recipient_id, content, created_at, read')
            .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('❌ Error fetching messages:', error);
            throw error;
          }

          // Get unique user IDs (excluding current user)
          const userIds = new Set<string>();
          messages?.forEach((msg: any) => {
            if (msg.sender_id !== user.id) userIds.add(msg.sender_id);
            if (msg.recipient_id !== user.id) userIds.add(msg.recipient_id);
          });

          if (userIds.size === 0) return [];

          // Get user profiles
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, created_at, updated_at')
            .in('id', Array.from(userIds));

          if (profileError) {
            console.error('❌ Error fetching profiles:', profileError);
            throw profileError;
          }

          // Calculate unread count and last message for each user
          const chatUsers: ChatUser[] = await Promise.all(
            (profiles || []).map(async (profile: any) => {
              // Get unread count
              const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('recipient_id', user.id)
                .eq('sender_id', profile.id)
                .eq('read', false);

              // Get last message
              const { data: lastMessageData } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${user.id},recipient_id.eq.${profile.id}),and(sender_id.eq.${profile.id},recipient_id.eq.${user.id})`)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              // Convert database message to Message type
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

  // Get total unread count
  const getTotalUnreadCount = useCallback(() => {
    const chatUsersQuery = useChatUsers();
    const chatUsers = chatUsersQuery.data || [];
    return chatUsers.reduce((total, user) => total + user.unread_count, 0);
  }, []);

  return {
    isConnected,
    useChatUsers,
    useConversation,
    useSendMessage,
    useMarkAsRead,
    getTotalUnreadCount,
    cleanup
  };
};
