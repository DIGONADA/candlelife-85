
import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Smile, Heart, ThumbsUp, Laugh, Frown, Angry } from "lucide-react";
import { EnhancedMessage } from "@/hooks/useEnhancedMessages";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EnhancedChatMessagesProps {
  messages: EnhancedMessage[];
  currentUserId?: string;
  isLoading: boolean;
  onReaction: (messageId: string, reaction: string) => void;
  searchTerm?: string;
}

const reactionEmojis = {
  like: { icon: ThumbsUp, emoji: "👍" },
  love: { icon: Heart, emoji: "❤️" },
  laugh: { icon: Laugh, emoji: "😂" },
  wow: { icon: Smile, emoji: "😮" },
  sad: { icon: Frown, emoji: "😢" },
  angry: { icon: Angry, emoji: "😡" }
};

export const EnhancedChatMessages = ({
  messages,
  currentUserId,
  isLoading,
  onReaction,
  searchTerm
}: EnhancedChatMessagesProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0 && !searchTerm) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, searchTerm]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Carregando mensagens...</span>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Smile className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nenhuma mensagem ainda.</p>
          <p className="text-xs mt-1">Seja o primeiro a enviar uma mensagem!</p>
        </div>
      </div>
    );
  }

  const highlightText = (text: string, searchTerm?: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  const isMyMessage = (senderId: string) => senderId === currentUserId;

  const formatMessageTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  const renderReactions = (reactions: any[] | undefined, messageId: string) => {
    if (!reactions || reactions.length === 0) return null;

    const reactionCounts = reactions.reduce((acc, r) => {
      acc[r.reaction] = (acc[r.reaction] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="flex gap-1 mt-1 flex-wrap">
        {Object.entries(reactionCounts).map(([reaction, count]) => {
          const reactionData = reactionEmojis[reaction as keyof typeof reactionEmojis];
          const userReacted = reactions.some(r => r.user_id === currentUserId && r.reaction === reaction);
          
          return (
            <Button
              key={reaction}
              variant={userReacted ? "default" : "outline"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onReaction(messageId, reaction)}
            >
              <span className="mr-1">{reactionData?.emoji || reaction}</span>
              {count as number}
            </Button>
          );
        })}
      </div>
    );
  };

  const renderMessageContent = (message: EnhancedMessage) => {
    switch (message.message_type) {
      case 'image':
        return (
          <div className="space-y-2">
            {message.attachment_url && (
              <img 
                src={message.attachment_url} 
                alt="Imagem compartilhada"
                className="max-w-xs rounded-lg"
              />
            )}
            {message.content && <p>{highlightText(message.content, searchTerm)}</p>}
          </div>
        );
      
      case 'file':
        return (
          <div className="space-y-2">
            {message.attachment_url && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">{message.file_name}</p>
                  {message.file_size && (
                    <p className="text-xs text-muted-foreground">
                      {(message.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                </div>
                <Button size="sm" variant="outline">
                  Download
                </Button>
              </div>
            )}
            {message.content && <p>{highlightText(message.content, searchTerm)}</p>}
          </div>
        );
      
      default:
        return <p className="break-words">{highlightText(message.content, searchTerm)}</p>;
    }
  };

  return (
    <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
      <div className="space-y-4 py-4">
        {searchTerm && (
          <div className="text-center">
            <Badge variant="secondary">
              Resultados para: "{searchTerm}"
            </Badge>
          </div>
        )}

        {messages.map((message, index) => {
          const isOwn = isMyMessage(message.sender_id);
          const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.sender_id !== message.sender_id);
          
          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
            >
              <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                {showAvatar && !isOwn && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {message.sender_username?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
                
                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isOwn
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    {renderMessageContent(message)}
                    
                    {message.edited_at && (
                      <p className="text-xs opacity-70 mt-1">
                        (editada)
                      </p>
                    )}
                  </div>
                  
                  {renderReactions(message.reactions || [], message.id)}
                  
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {formatMessageTime(message.created_at)}
                    </p>
                    
                    {isOwn && (
                      <Badge variant="outline" className="text-xs">
                        {message.message_status === 'read' ? '✓✓' : 
                         message.message_status === 'delivered' ? '✓' : '⏳'}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Quick reactions on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mt-1">
                    {Object.entries(reactionEmojis).slice(0, 3).map(([reaction, data]) => (
                      <Button
                        key={reaction}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onReaction(message.id, reaction)}
                      >
                        {data.emoji}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};
