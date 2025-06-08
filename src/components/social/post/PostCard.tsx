
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Post, usePosts } from "@/hooks/usePosts";
import { useAuth } from "@/context/AuthContext";
import { PostHeader } from "./PostHeader";
import { PostContent } from "./PostContent";
import { PostActions } from "./PostActions";
import { PostComments } from "./PostComments";

interface PostCardProps {
  post: Post;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onEdit: () => void;
  currentUserId?: string;
}

export const PostCard = ({ 
  post, 
  isExpanded, 
  onToggleExpanded, 
  onEdit, 
  currentUserId 
}: PostCardProps) => {
  const { user } = useAuth();
  const { getComments, addComment, deleteComment, toggleReaction } = usePosts();
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const handleToggleComments = async () => {
    if (isExpanded) {
      onToggleExpanded();
      return;
    }

    try {
      setIsLoadingComments(true);
      const postComments = await getComments(post.id);
      setComments(postComments);
      onToggleExpanded();
    } catch (error) {
      console.error("Erro ao carregar comentários:", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!user) return;

    try {
      await addComment.mutateAsync({
        postId: post.id,
        content
      });
      
      const updatedComments = await getComments(post.id);
      setComments(updatedComments);
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error);
      throw error;
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync({ 
        commentId, 
        postId: post.id 
      });
      
      const updatedComments = await getComments(post.id);
      setComments(updatedComments);
    } catch (error) {
      console.error("Erro ao excluir comentário:", error);
      throw error;
    }
  };

  const handleReact = async (type: 'like' | 'heart' | 'laugh' | 'wow' | 'sad') => {
    try {
      await toggleReaction.mutateAsync({
        postId: post.id,
        reactionType: type
      });
    } catch (error) {
      console.error("Erro ao reagir:", error);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <PostHeader 
          author={{
            username: post.profiles?.username || "Usuário",
            avatar_url: post.profiles?.avatar_url,
            id: post.user_id
          }}
          date={post.created_at}
          postId={post.id}
          canEdit={currentUserId === post.user_id}
          onEdit={onEdit}
        />
        
        <PostContent 
          content={post.content} 
          imageUrl={post.image_url} 
        />
        
        <PostActions
          post={post}
          onToggleComments={handleToggleComments}
          onReact={handleReact}
          isLoadingComments={isLoadingComments}
        />
        
        {isExpanded && (
          <PostComments
            postId={post.id}
            comments={comments}
            isLoading={isLoadingComments}
            user={user}
            currentUserId={currentUserId}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
          />
        )}
      </CardContent>
    </Card>
  );
};
