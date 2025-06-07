
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MessageCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { useMessagesContext } from "@/context/MessagesContext";
import { SwipeableChatItem } from "@/components/chat/SwipeableChatItem";

const ChatPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { 
    chatUsers,
    isLoadingChatUsers,
    getTotalUnreadCount,
    clearConversation,
    deleteConversation
  } = useMessagesContext();

  const filteredUsers = chatUsers.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = getTotalUnreadCount();

  const handleUserSelect = (user: any) => {
    navigate(`/chat/${user.id}`, { 
      state: { 
        username: user.username, 
        avatar_url: user.avatar_url 
      } 
    });
  };

  const handleClearConversation = (userId: string) => {
    clearConversation(userId);
  };

  const handleDeleteConversation = (userId: string) => {
    deleteConversation(userId);
  };

  if (isLoadingChatUsers) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6">
        <Spinner className="w-8 h-8 mb-4" />
        <p className="text-muted-foreground">Carregando conversas...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-full mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50 p-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold truncate">Conversas</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              <span className="truncate">Online</span>
              {totalUnread > 0 && (
                <span className="flex-shrink-0">• {totalUnread} mensagens não lidas</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl w-full"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-auto min-h-0">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-full">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">
              {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {searchQuery 
                ? "Tente buscar por outro nome de usuário" 
                : "Suas conversas aparecerão aqui quando você começar a trocar mensagens"
              }
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredUsers.map((user) => (
              <SwipeableChatItem
                key={user.id}
                chatUser={user}
                onSelectUser={handleUserSelect}
                onClearConversation={handleClearConversation}
                onDeleteConversation={handleDeleteConversation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
