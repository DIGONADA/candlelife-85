
export const messageKeys = {
  all: ['messages'] as const,
  chatUsers: () => [...messageKeys.all, 'chatUsers'] as const,
  conversation: (userId: string) => [...messageKeys.all, 'conversation', userId] as const,
  conversationWithSearch: (userId: string, searchTerm?: string) => 
    [...messageKeys.all, 'conversation', userId, searchTerm] as const,
  conversationSettings: (userId: string) => [...messageKeys.all, 'settings', userId] as const,
  unreadCount: () => [...messageKeys.all, 'unreadCount'] as const,
};
