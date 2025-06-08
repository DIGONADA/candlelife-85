
import { useState } from "react";
import { Post } from "@/hooks/usePosts";
import { PostCard } from "./PostCard";

interface PostListProps {
  posts: Post[];
  onEdit: (post: Post) => void;
  currentUserId?: string;
}

export const PostList = ({ posts, onEdit, currentUserId }: PostListProps) => {
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  const toggleExpanded = (postId: string) => {
    const newExpanded = new Set(expandedPosts);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
    }
    setExpandedPosts(newExpanded);
  };

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhuma publicação encontrada.</p>
        <p className="text-sm mt-2">Seja o primeiro a compartilhar algo!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          isExpanded={expandedPosts.has(post.id)}
          onToggleExpanded={() => toggleExpanded(post.id)}
          onEdit={() => onEdit(post)}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
};
