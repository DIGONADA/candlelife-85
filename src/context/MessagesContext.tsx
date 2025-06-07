
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useUnifiedChat } from '@/hooks/useUnifiedChat';
import { useToast } from '@/hooks/use-toast';
import { ChatUser } from '@/types/messages';

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
  
  // Add conversation hook for components to use
  useConversation: (otherUserId: string, searchTerm?: string) => any;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);

  const unifiedChatHook = useUnifiedChat();

  const {
    isConnected,
    activeConversation,
    setActiveConversation,
    useChatUsers,
    useConversation,
    useSendMessage,
    useMarkAsRead,
    useClearConversation,
    useDeleteConversation,
    getTotalUnreadCount
  } = unifiedChatHook;

  const chatUsersQuery = useChatUsers();
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkAsRead();
  const clearChatMutation = useClearConversation();
  const deleteChatMutation = useDeleteConversation();

  const chatUsers = useMemo(() => chatUsersQuery.data || [], [chatUsersQuery.data]);
  const isLoadingChatUsers = chatUsersQuery.isLoading;

  const markConversationAsRead = useCallback(async (userId: string) => {
    return new Promise<void>((resolve, reject) => {
      markAsReadMutation.mutate(userId, {
        onSuccess: () => {
          setUnreadCount(prev => Math.max(0, prev - 1));
          resolve();
        },
        onError: reject
      });
    });
  }, [markAsReadMutation]);

  const sendMessage = useCallback(async (
    recipientId: string, 
    content: string, 
    attachment?: File
  ) => {
    return new Promise<void>((resolve, reject) => {
      sendMessageMutation.mutate({
        recipientId,
        content,
        attachment
      }, {
        onSuccess: () => resolve(),
        onError: reject
      });
    });
  }, [sendMessageMutation]);

  const clearConversation = useCallback(async (userId: string) => {
    return new Promise<void>((resolve, reject) => {
      clearChatMutation.mutate(userId, {
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
  }, [clearChatMutation, toast]);

  const deleteConversation = useCallback(async (userId: string) => {
    return new Promise<void>((resolve, reject) => {
      deleteChatMutation.mutate(userId, {
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
  }, [deleteChatMutation, toast]);

  const contextValue = useMemo(() => ({
    activeConversation,
    isConnected,
    unreadCount,
    setActiveConversation,
    markConversationAsRead,
    sendMessage,
    clearConversation: clearConversation,
    deleteConversation: deleteConversation,
    chatUsers,
    isLoadingChatUsers,
    getTotalUnreadCount,
    useConversation
  }), [
    activeConversation,
    isConnected,
    unreadCount,
    setActiveConversation,
    markConversationAsRead,
    sendMessage,
    clearConversation,
    deleteConversation,
    chatUsers,
    isLoadingChatUsers,
    getTotalUnreadCount,
    useConversation
  ]);

  return (
    <MessagesContext.Provider value={contextValue}>
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
