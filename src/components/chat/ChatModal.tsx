
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DeleteConversationDialog } from "./DeleteConversationDialog";
import { ChatHeader } from "./ChatHeader";
import { ChatContent } from "./ChatContent";
import { useChatMessages } from "./hooks/useChatMessages";
import { useNotifications } from "@/hooks/useNotifications";

interface ChatModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
}

export const ChatModal = ({
  isOpen,
  onOpenChange,
  recipientId,
  recipientName,
  recipientAvatar,
}: ChatModalProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { setUserInChat } = useNotifications();
  
  const {
    messages,
    isLoading,
    isLoadingMore,
    isError,
    hasMore,
    totalCount,
    recipientIsTyping,
    searchQuery,
    isSearching,
    sendMessageIsPending,
    clearConversationIsPending,
    handleSearch,
    handleSendMessage,
    handleClearConversation,
    handleDeleteMessage,
    handleEditMessage,
    handleLoadMoreMessages,
    handleTypingStatusChange
  } = useChatMessages({ recipientId, isOpen });

  // Update notification service when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setUserInChat(true, recipientId);
    } else {
      setUserInChat(false);
    }

    return () => {
      setUserInChat(false);
    };
  }, [isOpen, recipientId, setUserInChat]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md md:max-w-xl p-0 gap-0 h-[80vh] max-h-[600px] flex flex-col">
          <ChatHeader 
            recipientName={recipientName}
            recipientAvatar={recipientAvatar}
            onSearchClick={() => {}}
            onClearChat={() => setIsDeleteDialogOpen(true)}
            onSearch={handleSearch}
            isSearching={isSearching}
          />

          <ChatContent
            messages={messages}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            isError={isError}
            hasMore={hasMore}
            totalCount={totalCount}
            searchQuery={searchQuery}
            recipientName={recipientName}
            recipientIsTyping={recipientIsTyping}
            isSubmitting={sendMessageIsPending}
            onDeleteMessage={handleDeleteMessage}
            onEditMessage={handleEditMessage}
            onLoadMore={handleLoadMoreMessages}
            onSendMessage={handleSendMessage}
            onTypingStatusChange={handleTypingStatusChange}
          />
        </DialogContent>
      </Dialog>

      <DeleteConversationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleClearConversation}
        isPending={clearConversationIsPending}
      />
    </>
  );
};
