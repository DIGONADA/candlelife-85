
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2, UserIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePosts } from "@/hooks/usePosts";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

interface PostHeaderProps {
  author: {
    username: string;
    avatar_url?: string | null;
    id: string;
  };
  date: string;
  postId: string;
  canEdit: boolean;
  onEdit: () => void;
}

export const PostHeader = ({ author, date, postId, canEdit, onEdit }: PostHeaderProps) => {
  const { toast } = useToast();
  const { deletePost } = usePosts();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const formattedDate = format(new Date(date), "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
    locale: ptBR,
  });
  
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deletePost.mutateAsync(postId);
      toast({
        title: "Publicação excluída",
        description: "A publicação foi excluída com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a publicação",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          {author.avatar_url ? (
            <AvatarImage src={author.avatar_url} alt={author.username} />
          ) : (
            <AvatarFallback>
              {author.username?.[0]?.toUpperCase() || <UserIcon className="h-4 w-4" />}
            </AvatarFallback>
          )}
        </Avatar>
        
        <div>
          <h4 className="font-medium">{author.username}</h4>
          <p className="text-sm text-muted-foreground">{formattedDate}</p>
        </div>
      </div>
      
      {canEdit && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DeleteConfirmDialog 
            isOpen={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onConfirm={handleDelete}
            isDeleting={isDeleting}
          />
        </>
      )}
    </div>
  );
};
