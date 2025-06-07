
import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Message, ChatUser } from '@/types/messages';
import { unifiedNotificationService } from '@/services/unifiedNotificationService';

export const useAdvancedMessages = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  
  const useConversation = (userId: string, searchTerm?: string) => {
    return useQuery({
      queryKey: ['conversation', userId, searchTerm],
      queryFn: async () => {
        if (!user) return { messages: [], hasNextPage: false };

        let query = supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${user.id},sender_id.eq.${userId}`)
          .or(`recipient_id.eq.${user.id},recipient_id.eq.${userId}`)
          .order('created_at', { ascending: true });

        if (searchTerm) {
          query = query.ilike('content', `%${searchTerm}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        return {
          messages: data || [],
          hasNextPage: false
        };
      },
    });
  };

  const useSendMessage = () => {
    return useMutation({
      mutationFn: async ({ content, recipientId }: { content: string; recipientId: string }) => {
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            recipient_id: recipientId,
            content,
            message_type: 'text'
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['conversation'] });
      }
    });
  };

  const useEditMessage = () => {
    return useMutation({
      mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase.rpc('edit_message', {
          p_message_id: messageId,
          p_user_id: user.id,
          p_new_content: content
        });

        if (error) throw error;
        return data;
      }
    });
  };

  const useDeleteMessage = () => {
    return useMutation({
      mutationFn: async (messageId: string) => {
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase.rpc('soft_delete_message', {
          p_message_id: messageId,
          p_user_id: user.id
        });

        if (error) throw error;
        return data;
      }
    });
  };

  const useMarkConversationAsRead = () => {
    return useMutation({
      mutationFn: async (userId: string) => {
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase.rpc('mark_conversation_as_read_v2', {
          p_recipient_id: user.id,
          p_sender_id: userId
        });

        if (error) throw error;
        return data;
      }
    });
  };

  const useClearConversation = () => {
    return useMutation({
      mutationFn: async (userId: string) => {
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase.rpc('clear_conversation', {
          p_user_id: user.id,
          p_other_user_id: userId
        });

        if (error) throw error;
        return data;
      }
    });
  };

  const updateUnreadCount = useCallback(() => {
    const unread = unifiedNotificationService.getUnreadCount();
    setTotalUnreadCount(unread);
  }, []);

  useEffect(() => {
    updateUnreadCount();
    const unsubscribe = unifiedNotificationService.subscribe(() => {
      updateUnreadCount();
    });

    return () => {
      unsubscribe();
    };
  }, [updateUnreadCount]);

  useEffect(() => {
    if (!user || !supabase) return;

    const messageChannel = supabase
      .channel('messages_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${user.id}`
      }, async (payload) => {
        const newMessage = payload.new as Message;
        
        const { data: senderData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', newMessage.sender_id)
          .single();

        if (senderData) {
          unifiedNotificationService.addMessageNotification(newMessage, {
            id: senderData.id,
            username: senderData.username,
            full_name: senderData.username || '',
            avatar_url: senderData.avatar_url || undefined,
            email: senderData.username || '',
            created_at: senderData.created_at,
            updated_at: senderData.updated_at,
            unread_count: 0
          });
        }

        updateUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [user, supabase, updateUnreadCount]);

  const getTotalUnreadCount = () => {
    return totalUnreadCount;
  };

  return {
    useConversation,
    useSendMessage,
    useEditMessage,
    useDeleteMessage,
    useMarkConversationAsRead,
    useClearConversation,
    getTotalUnreadCount
  };

  function useSendMessage() {
    return useMutation({
      mutationFn: async ({ content, recipientId }: { content: string; recipientId: string }) => {
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            recipient_id: recipientId,
            content,
            message_type: 'text'
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['conversation'] });
      }
    });
  }

  function useEditMessage() {
    return useMutation({
      mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase.rpc('edit_message', {
          p_message_id: messageId,
          p_user_id: user.id,
          p_new_content: content
        });

        if (error) throw error;
        return data;
      }
    });
  }

  function useDeleteMessage() {
    return useMutation({
      mutationFn: async (messageId: string) => {
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase.rpc('soft_delete_message', {
          p_message_id: messageId,
          p_user_id: user.id
        });

        if (error) throw error;
        return data;
      }
    });
  }

  function useMarkConversationAsRead() {
    return useMutation({
      mutationFn: async (userId: string) => {
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase.rpc('mark_conversation_as_read_v2', {
          p_recipient_id: user.id,
          p_sender_id: userId
        });

        if (error) throw error;
        return data;
      }
    });
  }

  function useClearConversation() {
    return useMutation({
      mutationFn: async (userId: string) => {
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase.rpc('clear_conversation', {
          p_user_id: user.id,
          p_other_user_id: userId
        });

        if (error) throw error;
        return data;
      }
    });
  }
};
