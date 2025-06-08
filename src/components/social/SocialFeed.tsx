
import { useState } from "react";
import { usePosts } from "@/hooks/usePosts";
import { useAuth } from "@/context/AuthContext";
import { PostEditor } from "./post/PostEditor";
import { PostList } from "./post/PostList";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorMessage } from "@/components/ui/error-message";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const SocialFeed = () => {
  const { user } = useAuth();
  const { posts, isLoadingPosts, postsError, refetchPosts } = usePosts();
  const [editingPost, setEditingPost] = useState<any>(null);

  const handleEditPost = (post: any) => {
    setEditingPost(post);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
  };

  if (postsError) {
    return (
      <ErrorMessage
        title="Erro ao carregar publicações"
        message="Não foi possível carregar as publicações. Tente novamente."
        onRetry={refetchPosts}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PostEditor editingPost={editingPost} onCancelEdit={handleCancelEdit} />
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">Todas as Publicações</TabsTrigger>
          <TabsTrigger value="mine">Minhas Publicações</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {isLoadingPosts ? (
            <LoadingSpinner />
          ) : (
            <PostList 
              posts={posts} 
              onEdit={handleEditPost}
              currentUserId={user?.id}
            />
          )}
        </TabsContent>
        
        <TabsContent value="mine" className="space-y-4">
          {isLoadingPosts ? (
            <LoadingSpinner />
          ) : (
            <PostList 
              posts={posts.filter(post => post.user_id === user?.id)}
              onEdit={handleEditPost}
              currentUserId={user?.id}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
