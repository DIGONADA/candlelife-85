import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useMessages } from '@/hooks/useMessages';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useNotificationSystem } from '@/hooks/useNotificationSystem';
import { unifiedNotificationService } from '@/services/unifiedNotificationService';
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
  deleteMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  
  // Notification system
  requestNotificationPermissions: () => Promise<boolean>;
  
  // Hooks for components
  useChatUsers: ReturnType<typeof useMessages>['useChatUsers'];
  useConversation: ReturnType<typeof useMessages>['useConversation'];
  showNotification: (message: Message) => Promise<void>;
  
  // Direct data access
  chatUsers: ChatUser[];
  isLoadingChatUsers: boolean;
  getTotalUnreadCount: () => number;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeConversation, setActiveConversationState] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const {
    useChatUsers,
    useConversation,
    useSendMessage,
    useMarkConversationAsRead,
    useClearConversation,
    useDeleteMessage,
    useEditMessage,
    showNotification,
    chatUsers,
    isLoadingChatUsers,
    getTotalUnreadCount
  } = useMessages();

  // Inicializar sistema de notificações
  const {
    handleNewMessage: processNotification,
    requestPermissions,
    isInitialized: notificationSystemReady
  } = useNotificationSystem();

  const sendMessage = useSendMessage();
  const markAsRead = useMarkConversationAsRead();
  const clearChat = useClearConversation();
  const deleteMsg = useDeleteMessage();
  const editMsg = useEditMessage();

  // Handle new messages from realtime with enhanced notifications
  const handleNewMessage = useCallback(async (message: Message) => {
    console.log('🔔 New message in context:', message);
    
    // Show notification if not from current user
    if (message.sender_id !== user?.id) {
      // Get sender info for notification with complete ChatUser type
      const senderInfo = chatUsers.find(u => u.id === message.sender_id) || {
        id: message.sender_id,
        username: 'Usuário',
        full_name: 'Usuário',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        unread_count: 0
      } as ChatUser;

      // Add notification to unified system
      unifiedNotificationService.addMessageNotification(message, senderInfo);

      // Process notification with sound and push
      if (notificationSystemReady) {
        await processNotification(message, senderInfo);
      }

      // Fallback to basic notification
      if (!activeConversation || message.sender_id !== activeConversation || document.hidden) {
        await showNotification(message);
      }
    }
    
    // Update unread count
    setUnreadCount(prev => prev + 1);
  }, [user?.id, activeConversation, chatUsers, processNotification, notificationSystemReady, showNotification]);

  const handleMessageUpdate = useCallback((message: Message) => {
    console.log('📝 Message updated in context:', message);
  }, []);

  // Setup realtime
  const { isConnected } = useRealtimeMessages({
    activeConversation: activeConversation || undefined,
    onNewMessage: handleNewMessage,
    onMessageUpdate: handleMessageUpdate
  });

  // Auto-request permissions when user logs in
  useEffect(() => {
    if (user && notificationSystemReady) {
      // Request permissions with a slight delay to avoid overwhelming the user
      setTimeout(() => {
        requestPermissions();
      }, 2000);
    }
  }, [user, notificationSystemReady, requestPermissions]);

  const setActiveConversation = useCallback((userId: string | null) => {
    console.log('📱 Setting active conversation:', userId);
    setActiveConversationState(userId);
    
    // Mark as read when opening conversation
    if (userId) {
      setTimeout(() => {
        markAsRead.mutate(userId, {
          onSuccess: () => {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        });
      }, 1000);
    }
  }, [markAsRead]);

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
        attachmentUrl: attachment ? URL.createObjectURL(attachment) : undefined,
        fileName: attachment?.name,
        fileSize: attachment?.size
      }, {
        onSuccess: () => resolve(),
        onError: reject
      });
    });
  }, [sendMessage]);

  const clearConversationAction = useCallback(async (userId: string) => {
    return new Promise<void>((resolve, reject) => {
      clearChat.mutate(userId, {
        onSuccess: () => resolve(),
        onError: reject
      });
    });
  }, [clearChat]);

  const deleteMessageAction = useCallback(async (messageId: string) => {
    return new Promise<void>((resolve, reject) => {
      deleteMsg.mutate(messageId, {
        onSuccess: () => resolve(),
        onError: reject
      });
    });
  }, [deleteMsg]);

  const editMessageAction = useCallback(async (messageId: string, content: string) => {
    return new Promise<void>((resolve, reject) => {
      editMsg.mutate({ messageId, content }, {
        onSuccess: () => resolve(),
        onError: reject
      });
    });
  }, [editMsg]);

  return (
    <MessagesContext.Provider value={{
      activeConversation,
      isConnected,
      unreadCount,
      setActiveConversation,
      markConversationAsRead,
      sendMessage: sendMessageAction,
      clearConversation: clearConversationAction,
      deleteMessage: deleteMessageAction,
      editMessage: editMessageAction,
      requestNotificationPermissions: requestPermissions,
      useChatUsers,
      useConversation,
      showNotification,
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
