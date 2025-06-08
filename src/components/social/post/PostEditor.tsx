
import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageIcon, Loader2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePosts } from "@/hooks/usePosts";
import { useToast } from "@/hooks/use-toast";

interface PostEditorProps {
  editingPost?: {
    id: string;
    content: string;
    image_url: string | null;
  } | null;
  onCancelEdit?: () => void;
}

export const PostEditor = ({ editingPost, onCancelEdit }: PostEditorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createPost, updatePost } = usePosts();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [content, setContent] = useState(editingPost?.content || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(editingPost?.image_url || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!editingPost;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter menos de 5MB",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !imageFile && !imagePreview) {
      toast({
        title: "Erro",
        description: "Adicione um texto ou imagem para publicar",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && editingPost) {
        await updatePost.mutateAsync({
          id: editingPost.id,
          content: content.trim(),
          imageFile: imageFile || undefined,
          keepExistingImage: !imageFile && !!imagePreview
        });
        if (onCancelEdit) onCancelEdit();
      } else {
        await createPost.mutateAsync({
          content: content.trim(),
          imageFile: imageFile || undefined
        });
        setContent("");
        setImageFile(null);
        setImagePreview(null);
      }

      toast({
        title: "Sucesso",
        description: isEditing ? "Publicação atualizada!" : "Publicação criada!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a publicação",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex gap-4">
          <Avatar className="h-10 w-10">
            {user?.user_metadata?.avatar_url ? (
              <AvatarImage src={user.user_metadata.avatar_url} />
            ) : (
              <AvatarFallback>
                {user?.user_metadata?.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            )}
          </Avatar>
          
          <div className="flex-1 space-y-4">
            <Textarea
              placeholder={isEditing ? "Edite sua publicação..." : "No que você está pensando?"}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            
            {imagePreview && (
              <div className="relative inline-block">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-h-60 rounded-lg object-cover"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                {imagePreview ? "Trocar imagem" : "Adicionar imagem"}
              </Button>
              
              <div className="flex gap-2">
                {isEditing && onCancelEdit && (
                  <Button
                    variant="outline"
                    onClick={onCancelEdit}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || (!content.trim() && !imageFile && !imagePreview)}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isEditing ? "Salvando..." : "Publicando..."}
                    </>
                  ) : (
                    isEditing ? "Salvar" : "Publicar"
                  )}
                </Button>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
