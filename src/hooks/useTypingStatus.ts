
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { TypingStatus } from "@/types/social";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export const useTypingStatus = () => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // Usar o hook de subscription para typing status
  useRealtimeSubscription({
    tableName: 'typing_status',
    onDataChange: () => {
      console.log("📢 Typing status change detected");
      // A lógica de atualização será feita via subscription direta
    },
    dependencies: [user?.id]
  });

  // Setup direct subscription for typing status with custom logic
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`typing_status_${user.id}`);

    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'typing_status'
    }, (payload) => {
      const typingStatus = payload.new as TypingStatus;
      
      if (typingStatus && typingStatus.conversation_with_user_id === user?.id) {
        setTypingUsers(prev => ({
          ...prev,
          [typingStatus.user_id]: typingStatus.is_typing
        }));

        // Remover status após timeout se não foi atualizado
        if (typingStatus.is_typing) {
          const timeoutKey = typingStatus.user_id;
          
          if (typingTimeouts.current[timeoutKey]) {
            clearTimeout(typingTimeouts.current[timeoutKey]);
          }

          typingTimeouts.current[timeoutKey] = setTimeout(() => {
            setTypingUsers(prev => ({
              ...prev,
              [typingStatus.user_id]: false
            }));
          }, 5000);
        }
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Enviar status de digitação
  const sendTypingStatus = async (conversationWithUserId: string, isTyping: boolean) => {
    if (!user) return;

    try {
      await supabase.rpc('update_typing_status', {
        p_user_id: user.id,
        p_conversation_with_user_id: conversationWithUserId,
        p_is_typing: isTyping
      });

      // Auto-remover status de digitação após 3 segundos
      if (isTyping) {
        const timeoutKey = `${user.id}-${conversationWithUserId}`;
        
        if (typingTimeouts.current[timeoutKey]) {
          clearTimeout(typingTimeouts.current[timeoutKey]);
        }

        typingTimeouts.current[timeoutKey] = setTimeout(() => {
          sendTypingStatus(conversationWithUserId, false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  // Verificar se usuário está digitando em conversa específica
  const isUserTyping = (userId: string): boolean => {
    return typingUsers[userId] || false;
  };

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      Object.values(typingTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  return {
    sendTypingStatus,
    isUserTyping,
    typingUsers
  };
};
