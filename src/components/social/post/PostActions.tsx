
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Post } from "@/hooks/usePosts";
import { ReactionBar } from "./ReactionBar";

interface PostActionsProps {
  post: Post;
  onToggleComments: () => void;
  onReact: (type: 'like' | 'heart' | 'laugh' | 'wow' | 'sad') => void;
  isLoadingComments: boolean;
}

export const PostActions = ({ 
  post, 
  onToggleComments, 
  onReact, 
  isLoadingComments 
}: PostActionsProps) => {
  return (
    <div className="flex justify-between items-center pt-2 border-t">
      <ReactionBar 
        postId={post.id}
        reactions={post.reactions || { like: 0, heart: 0, laugh: 0, wow: 0, sad: 0 }}
        myReaction={post.my_reaction || null}
        onReact={onReact}
        reactionsCount={post.reactions_count || 0}
      />
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onToggleComments}
        disabled={isLoadingComments}
        className="flex items-center gap-2"
      >
        <MessageSquare className="h-4 w-4" />
        <span>
          {post.comments_count > 0 
            ? `${post.comments_count} comentário${post.comments_count > 1 ? 's' : ''}`
            : "Comentar"
          }
        </span>
      </Button>
    </div>
  );
};
