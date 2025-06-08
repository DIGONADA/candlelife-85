
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useGlobalChatListener } from "@/hooks/useGlobalChatListener";
import { SocialFeed } from "@/components/social/SocialFeed";
import { Card, CardContent } from "@/components/ui/card";

const Social = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  useGlobalChatListener();

  useEffect(() => {
    if (!user) {
      toast({
        title: "Acesso restrito",
        description: "Você precisa estar autenticado para acessar a rede social.",
        variant: "destructive",
      });
      navigate('/login', { replace: true });
    }
  }, [user, toast, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-8">
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="p-6">
            <h1 className="text-3xl font-bold mb-2">Rede Social</h1>
            <p className="text-muted-foreground">
              Conecte-se com outros usuários, compartilhe pensamentos e descubra conteúdos interessantes.
            </p>
          </CardContent>
        </Card>
      </div>
      
      <SocialFeed />
    </div>
  );
};

export default Social;
