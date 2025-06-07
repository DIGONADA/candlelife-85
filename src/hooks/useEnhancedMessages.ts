
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from './use-toast';
import { messageKeys } from '@/lib/query-keys';
import { Message, ChatUser, MessageStatus, MessageType } from '@/types/messages';

// Export types that enhanced components expect
export interface EnhancedMessage extends Message {}

export interface ConversationSettings {
  id?: string;
  user_id?: string;
  other_user_id?: string;
  notifications_enabled: boolean;
  archived: boolean;
  pinned: boolean;
  muted: boolean;
  nickname: string;
  background_image: string;
  created_at?: string;
  updated_at?: string;
}

export const useEnhancedMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  // Setup realtime listener for new messages
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`messages_${user.id}`);
    
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `recipient_id=eq.${user.id}`
    }, (payload) => {
      queryClient.invalidateQueries({ queryKey: messageKeys.chatUsers() });
      queryClient.invalidateQueries({ queryKey: messageKeys.conversation(payload.new.sender_id) });
    });

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id, queryClient]);

  // Get chat users
  const useChatUsers = () => {
    return useQuery({
      queryKey: messageKeys.chatUsers(),
      queryFn: async (): Promise<ChatUser[]> => {
        if (!user?.id) return [];

        const { data: messages, error } = await supabase
          .from('messages')
          .select('sender_id, recipient_id')
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (error) throw error;

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

        if (profileError) throw profileError;

        const chatUsers: ChatUser[] = await Promise.all(
          (profiles || []).map(async (profile: any) => {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('recipient_id', user.id)
              .eq('sender_id', profile.id)
              .eq('read', false);

            return {
              id: profile.id,
              username: profile.username || 'Usuário',
              full_name: profile.username || undefined,
              avatar_url: profile.avatar_url || undefined,
              email: profile.username || undefined,
              created_at: profile.created_at || new Date().toISOString(),
              updated_at: profile.updated_at || new Date().toISOString(),
              unread_count: count || 0
            };
          })
        );

        return chatUsers;
      },
      enabled: !!user,
      staleTime: 30000,
    });
  };

  // Get conversation messages
  const useConversation = (otherUserId: string, searchTerm?: string) => {
    return useQuery({
      queryKey: messageKeys.conversationWithSearch(otherUserId, searchTerm || ''),
      queryFn: async (): Promise<EnhancedMessage[]> => {
        if (!user || !otherUserId) return [];

        let query = supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
          .order('created_at', { ascending: true });

        if (searchTerm) {
          query = query.ilike('content', `%${searchTerm}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        const messages: EnhancedMessage[] = (data || []).map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          recipient_id: msg.recipient_id,
          created_at: msg.created_at,
          read: msg.read || false,
          message_status: msg.message_status || MessageStatus.SENT,
          message_type: MessageType.TEXT,
          attachment_url: msg.attachment_url || undefined,
          deleted_by_recipient: false,
          reactions: [],
          sender_username: undefined,
          sender_avatar_url: undefined,
          file_name: undefined,
          file_size: undefined
        }));

        return messages;
      },
      enabled: !!user && !!otherUserId,
    });
  };

  // Send message mutation
  const useSendMessage = () => useMutation({
    mutationFn: async ({ 
      recipientId, 
      content, 
      messageType = 'text',
      attachmentUrl,
      fileName,
      fileSize
    }: { 
      recipientId: string; 
      content: string; 
      messageType?: string;
      attachmentUrl?: string;
      fileName?: string;
      fileSize?: number;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          content,
          message_status: 'sent',
          attachment_url: attachmentUrl
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: messageKeys.chatUsers() });
      queryClient.invalidateQueries({ queryKey: messageKeys.conversation(data.recipient_id) });
    }
  });

  // Toggle reaction mutation (placeholder)
  const useToggleReaction = () => useMutation({
    mutationFn: async ({ messageId, reaction }: { messageId: string; reaction: string }) => {
      // Placeholder - reactions not implemented in database yet
      console.log('Toggle reaction:', messageId, reaction);
    }
  });

  // Mark conversation as read
  const useMarkConversationAsRead = () => useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('recipient_id', user.id)
        .eq('sender_id', otherUserId)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.chatUsers() });
    }
  });

  // Clear conversation mutation (placeholder)
  const useClearConversation = () => useMutation({
    mutationFn: async (otherUserId: string) => {
      // Placeholder - clear conversation not implemented yet
      console.log('Clear conversation:', otherUserId);
    }
  });

  // Conversation settings query (placeholder)
  const useConversationSettings = (otherUserId: string) => {
    return useQuery({
      queryKey: ['conversation-settings', otherUserId],
      queryFn: async (): Promise<ConversationSettings | null> => {
        // Placeholder - conversation settings not implemented yet
        return {
          notifications_enabled: true,
          archived: false,
          pinned: false,
          muted: false,
          nickname: '',
          background_image: ''
        };
      },
      enabled: !!user && !!otherUserId
    });
  };

  // Update conversation settings mutation (placeholder)
  const useUpdateConversationSettings = () => useMutation({
    mutationFn: async ({ otherUserId, settings }: { otherUserId: string; settings: Partial<ConversationSettings> }) => {
      // Placeholder - update conversation settings not implemented yet
      console.log('Update conversation settings:', otherUserId, settings);
    }
  });

  return {
    isConnected,
    useChatUsers,
    useConversation,
    useSendMessage,
    useToggleReaction,
    useMarkConversationAsRead,
    useClearConversation,
    useConversationSettings,
    useUpdateConversationSettings,
    setActiveConversation
  };
};
