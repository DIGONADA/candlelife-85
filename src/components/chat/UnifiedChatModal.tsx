
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, ArrowLeft, Loader2 } from "lucide-react";
import { useUnifiedChat } from "@/hooks/useUnifiedChat";
import { useAuth } from "@/context/AuthContext";

interface UnifiedChatModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
}

export const UnifiedChatModal = ({
  isOpen,
  onOpenChange,
  recipientId,
  recipientName,
  recipientAvatar,
}: UnifiedChatModalProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    useConversation, 
    useSendMessage, 
    useMarkAsRead,
    setActiveConversation 
  } = useUnifiedChat();
  
  const conversationQuery = useConversation(recipientId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  
  const messages = conversationQuery.data || [];

  // Set active conversation when modal opens
  useEffect(() => {
    if (isOpen && recipientId) {
      setActiveConversation(recipientId);
    } else {
      setActiveConversation(null);
    }
  }, [isOpen, recipientId, setActiveConversation]);

  // Auto-scroll para o final quando novas mensagens chegam
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Marcar mensagens como lidas ao abrir conversa
  useEffect(() => {
    if (isOpen && recipientId) {
      setTimeout(() => {
        markAsRead.mutate(recipientId);
      }, 1000);
    }
  }, [isOpen, recipientId, markAsRead]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      await sendMessage.mutateAsync({
        recipientId,
        content: message.trim()
      });
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isMyMessage = (senderId: string) => senderId === user?.id;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-xl p-0 gap-0 h-[80vh] max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <Avatar className="h-8 w-8">
            {recipientAvatar ? (
              <AvatarImage src={recipientAvatar} alt={recipientName} />
            ) : (
              <AvatarFallback>
                {recipientName.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          
          <div>
            <h3 className="font-medium">{recipientName}</h3>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {conversationQuery.isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Carregando mensagens...</span>
              </div>
            )}

            {!conversationQuery.isLoading && messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma mensagem ainda.</p>
                <p className="text-sm">Seja o primeiro a enviar uma mensagem!</p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${isMyMessage(msg.sender_id) ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    isMyMessage(msg.sender_id)
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  }`}
                >
                  <p className="text-sm break-words">{msg.content}</p>
                  <p className={`text-xs mt-1 ${
                    isMyMessage(msg.sender_id) 
                      ? 'text-primary-foreground/70' 
                      : 'text-muted-foreground'
                  }`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            ))}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="flex-1"
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessage.isPending}
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
