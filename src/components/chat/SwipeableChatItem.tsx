
import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, RotateCcw, Circle } from 'lucide-react';
import { ChatUser } from '@/types/messages';
import { useUserPresence } from '@/hooks/useUserPresence';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SwipeableChatItemProps {
  chatUser: ChatUser;
  onSelectUser: (user: ChatUser) => void;
  onClearConversation: (userId: string) => void;
  onDeleteConversation: (userId: string) => void;
}

export const SwipeableChatItem = ({
  chatUser,
  onSelectUser,
  onClearConversation,
  onDeleteConversation,
}: SwipeableChatItemProps) => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showActions, setShowActions] = useState<'clear' | 'delete' | null>(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  const { isUserOnline, getLastSeen } = useUserPresence();
  const isOnline = isUserOnline(chatUser.id);
  const lastSeen = getLastSeen(chatUser.id);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Limit drag distance
    const maxDrag = 120;
    const limitedDiff = Math.max(-maxDrag, Math.min(maxDrag, diff));
    setDragX(limitedDiff);
    
    // Show action preview
    if (limitedDiff > 60) {
      setShowActions('clear');
    } else if (limitedDiff < -60) {
      setShowActions('delete');
    } else {
      setShowActions(null);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    if (Math.abs(dragX) > 60) {
      if (dragX > 0) {
        onClearConversation(chatUser.id);
      } else {
        onDeleteConversation(chatUser.id);
      }
    }
    
    setDragX(0);
    setShowActions(null);
  };

  const handleClick = () => {
    if (Math.abs(dragX) < 10) {
      onSelectUser(chatUser);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Action buttons background */}
      <div className="absolute inset-0 flex items-center justify-between px-4">
        <div className={cn(
          "flex items-center gap-2 text-blue-600 transition-opacity duration-200",
          showActions === 'clear' ? "opacity-100" : "opacity-0"
        )}>
          <RotateCcw className="h-5 w-5" />
          <span className="text-sm font-medium">Limpar</span>
        </div>
        
        <div className={cn(
          "flex items-center gap-2 text-red-600 transition-opacity duration-200",
          showActions === 'delete' ? "opacity-100" : "opacity-0"
        )}>
          <span className="text-sm font-medium">Excluir</span>
          <Trash2 className="h-5 w-5" />
        </div>
      </div>

      {/* Main card */}
      <Card
        className={cn(
          "cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] relative z-10",
          showActions === 'clear' && "bg-blue-50 border-blue-200",
          showActions === 'delete' && "bg-red-50 border-red-200"
        )}
        style={{ transform: `translateX(${dragX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={chatUser.avatar_url} alt={chatUser.username} />
                <AvatarFallback>
                  {chatUser.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {/* Status indicator */}
              <Circle 
                className={cn(
                  "absolute -bottom-1 -right-1 h-4 w-4 border-2 border-background",
                  isOnline ? "text-green-500 fill-green-500" : "text-gray-400 fill-gray-400"
                )}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm sm:text-base truncate">
                  {chatUser.username}
                </h3>
                {isOnline && (
                  <span className="text-xs text-green-600 font-medium">
                    Online
                  </span>
                )}
              </div>
              
              {chatUser.last_message && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {chatUser.last_message.content}
                  </p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(chatUser.last_message.created_at), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </span>
                </div>
              )}
              
              {!isOnline && lastSeen && (
                <p className="text-xs text-muted-foreground">
                  Visto por último {formatDistanceToNow(new Date(lastSeen), {
                    addSuffix: true,
                    locale: ptBR
                  })}
                </p>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-2">
              {chatUser.unread_count > 0 && (
                <Badge variant="destructive" className="h-6 w-6 flex items-center justify-center p-0">
                  {chatUser.unread_count > 9 ? "9+" : chatUser.unread_count}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
