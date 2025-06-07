
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useUnifiedChat } from '@/hooks/useUnifiedChat';
import { useToast } from '@/hooks/use-toast';
import { Message, ChatUser } from '@/types/messages';

interface MessagesContextType {
  // State
  activeConversation: string | null;
  isConnected: boolean;
  unreadCount: number;
  
  // Actions
  setActiveConversation: (userId: string | null) => void;
  markConversationAsRead: (userId: string) => Promise<void>;
  sendMessage: (recipientId: string, content: string, attachment?: File) => Promise<void>;
  clearConversation: (userId: string) => Promise<void>;
  deleteConversation: (userId: string) => Promise<void>;
  
  // Direct data access
  chatUsers: ChatUser[];
  isLoadingChatUsers: boolean;
  getTotalUnreadCount: () => number;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);

  const {
    isConnected,
    activeConversation,
    setActiveConversation,
    useChatUsers,
    useSendMessage,
    useMarkAsRead,
    useClearConversation,
    useDeleteConversation,
    getTotalUnreadCount
  } = useUnifiedChat();

  const chatUsersQuery = useChatUsers();
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const clearChat = useClearConversation();
  const deleteChat = useDeleteConversation();

  const chatUsers = chatUsersQuery.data || [];
  const isLoadingChatUsers = chatUsersQuery.isLoading;

  const markConversationAsRead = useCallback(async (userId: string) => {
    return new Promise<void>((resolve, reject) => {
      markAsRead.mutate(userId, {
        onSuccess: () => {
          setUnreadCount(prev => Math.max(0, prev - 1));
          resolve();
        },
        onError: reject
      });
    });
  }, [markAsRead]);

  const sendMessageAction = useCallback(async (
    recipientId: string, 
    content: string, 
    attachment?: File
  ) => {
    return new Promise<void>((resolve, reject) => {
      sendMessage.mutate({
        recipientId,
        content,
        attachment
      }, {
        onSuccess: () => resolve(),
        onError: reject
      });
    });
  }, [sendMessage]);

  const clearConversationAction = useCallback(async (userId: string) => {
    return new Promise<void>((resolve, reject) => {
      clearChat.mutate(userId, {
        onSuccess: () => {
          toast({
            title: "Conversa limpa",
            description: "A conversa foi limpa com sucesso.",
          });
          resolve();
        },
        onError: (error) => {
          toast({
            title: "Erro",
            description: "Não foi possível limpar a conversa.",
            variant: "destructive",
          });
          reject(error);
        }
      });
    });
  }, [clearChat, toast]);

  const deleteConversationAction = useCallback(async (userId: string) => {
    return new Promise<void>((resolve, reject) => {
      deleteChat.mutate(userId, {
        onSuccess: () => {
          toast({
            title: "Conversa excluída",
            description: "A conversa foi excluída permanentemente.",
          });
          resolve();
        },
        onError: (error) => {
          toast({
            title: "Erro",
            description: "Não foi possível excluir a conversa.",
            variant: "destructive",
          });
          reject(error);
        }
      });
    });
  }, [deleteChat, toast]);

  return (
    <MessagesContext.Provider value={{
      activeConversation,
      isConnected,
      unreadCount,
      setActiveConversation,
      markConversationAsRead,
      sendMessage: sendMessageAction,
      clearConversation: clearConversationAction,
      deleteConversation: deleteConversationAction,
      chatUsers,
      isLoadingChatUsers,
      getTotalUnreadCount
    }}>
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessagesContext = () => {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error('useMessagesContext must be used within a MessagesProvider');
  }
  return context;
};
