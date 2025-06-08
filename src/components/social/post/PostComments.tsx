
import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { Comment } from "@/hooks/usePosts";
import { CommentsList } from "./CommentsList";
import { CommentForm } from "./CommentForm";
import { useToast } from "@/hooks/use-toast";

interface PostCommentsProps {
  postId: string;
  comments: Comment[];
  isLoading: boolean;
  user: User | null;
  currentUserId?: string;
  onAddComment: (content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

export const PostComments = ({ 
  postId,
  comments, 
  isLoading, 
  user,
  currentUserId,
  onAddComment,
  onDeleteComment
}: PostCommentsProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleAddComment = async (content: string) => {
    if (!content.trim()) {
      toast({
        title: "Erro",
        description: "O comentário não pode estar vazio",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onAddComment(content);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o comentário",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteComment = async (commentId: string) => {
    try {
      await onDeleteComment(commentId);
      toast({
        title: "Sucesso",
        description: "Comentário excluído com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o comentário",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="border-t pt-4 space-y-4">
      <CommentsList 
        comments={comments} 
        isLoading={isLoading}
        currentUserId={currentUserId}
        onDeleteComment={handleDeleteComment}
      />
      
      <CommentForm 
        user={user} 
        isSubmitting={isSubmitting}
        onSubmit={handleAddComment}
      />
    </div>
  );
};
