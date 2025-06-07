
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Message, ChatUser } from '@/types/messages';
import { useSimpleMessages } from './useSimpleMessages';

export const useSimpleChat = () => {
  const [conversations, setConversations] = useState<ChatUser[]>([]);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const {
    useChatUsers,
    useConversation,
    useSendMessage,
    useMarkAsRead,
    getTotalUnreadCount
  } = useSimpleMessages();

  const getConversations = () => {
    return useChatUsers();
  };

  const getConversationMessages = (userId: string) => {
    return useConversation(userId);
  };

  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();

  const conversationsQuery = getConversations();

  return {
    conversations,
    getConversations,
    getConversationMessages,
    sendMessage,
    markAsRead,
    chatUsers: conversationsQuery.data || [],
    isLoadingChatUsers: conversationsQuery.isLoading,
    getTotalUnreadCount
  };
};
