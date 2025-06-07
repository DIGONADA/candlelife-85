
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from './use-toast';
import { messageKeys } from '@/lib/query-keys';
import { Message, ChatUser, MessageStatus, MessageType } from '@/types/messages';

export const useEnhancedMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
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
  const useConversation = (otherUserId: string) => {
    return useQuery({
      queryKey: messageKeys.conversation(otherUserId),
      queryFn: async (): Promise<Message[]> => {
        if (!user || !otherUserId) return [];

        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const messages: Message[] = (data || []).map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          recipient_id: msg.recipient_id,
          created_at: msg.created_at,
          read: msg.read || false,
          message_status: msg.message_status || MessageStatus.SENT,
          message_type: MessageType.TEXT,
          attachment_url: msg.attachment_url,
          deleted_by_recipient: false,
          reactions: []
        }));

        return messages;
      },
      enabled: !!user && !!otherUserId,
    });
  };

  return {
    isConnected,
    useChatUsers,
    useConversation
  };
};
