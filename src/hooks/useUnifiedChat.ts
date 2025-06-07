import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from './use-toast';
import { messageKeys } from '@/lib/query-keys';
import { chatSubscriptionManager } from '@/services/ChatSubscriptionManager';
import { 
  Message, 
  ChatUser, 
  MessageStatus,
  MessageType
} from '@/types/messages';

export const useUnifiedChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const hasSetupRef = useRef(false);

  // Setup chat subscription only once
  useEffect(() => {
    if (!user?.id || hasSetupRef.current) {
      return;
    }

    mountedRef.current = true;
    hasSetupRef.current = true;
    
    console.log('🔄 Setting up chat for user:', user.id);
    
    // Set query client in manager
    chatSubscriptionManager.setQueryClient(queryClient);
    
    // Subscribe to chat
    chatSubscriptionManager.subscribe(user.id);
    
    // Check connection status periodically
    const statusInterval = setInterval(() => {
      if (mountedRef.current) {
        const connected = chatSubscriptionManager.isConnected() && 
                         chatSubscriptionManager.getCurrentUserId() === user.id;
        setIsConnected(connected);
      }
    }, 2000);

    return () => {
      mountedRef.current = false;
      hasSetupRef.current = false;
      clearInterval(statusInterval);
      chatSubscriptionManager.unsubscribe();
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
    cleanup: () => chatSubscriptionManager.forceCleanup()
  };
};
