
import { useEffect } from "react";
import { useToast } from "./use-toast";
import { usePostQueries } from "./posts/usePostQueries";
import { usePostMutations } from "./posts/usePostMutations";
import { useCommentMutations } from "./posts/useCommentMutations";
import { useReactionMutations } from "./posts/useReactionMutations";
import { Post, Comment } from "./posts/types";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

// Exportando tipos para uso em outros componentes
export type { Post, Comment };

export const usePosts = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { 
    posts, 
    isLoadingPosts, 
    postsError, 
    refetchPosts, 
    getComments,
    isUploading,
    setIsUploading
  } = usePostQueries();
  
  const { createPost, updatePost, deletePost } = usePostMutations(setIsUploading);
  const { addComment, deleteComment } = useCommentMutations();
  const { toggleReaction } = useReactionMutations();

  // Efeito para mostrar toast quando há erro na consulta de posts
  useEffect(() => {
    if (postsError) {
      toast({
        title: "Erro",
        description: `Não foi possível carregar as publicações: ${(postsError as Error).message}`,
        variant: "destructive",
      });
    }
  }, [postsError, toast]);

  // Usar o hook de subscription para posts
  useRealtimeSubscription({
    tableName: 'posts',
    onDataChange: () => {
      console.log("📢 Posts change detected");
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    dependencies: [user?.id]
  });

  // Usar o hook de subscription para comentários
  useRealtimeSubscription({
    tableName: 'comments',
    onDataChange: () => {
      console.log("📢 Comments change detected");
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    dependencies: [user?.id]
  });

  // Usar o hook de subscription para reações
  useRealtimeSubscription({
    tableName: 'reactions',
    onDataChange: () => {
      console.log("📢 Reactions change detected");
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    dependencies: [user?.id]
  });

  return {
    // Queries
    posts,
    isLoadingPosts,
    postsError,
    isUploading,
    refetchPosts,
    getComments,
    
    // Mutations para posts
    createPost,
    updatePost,
    deletePost,
    
    // Mutations para comentários
    addComment,
    deleteComment,
    
    // Mutations para reações
    toggleReaction
  };
};
