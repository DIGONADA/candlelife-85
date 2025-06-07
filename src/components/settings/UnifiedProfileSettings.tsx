
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserRound, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Separator } from "@/components/ui/separator";

export const UnifiedProfileSettings = () => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      if (!user) return;
      
      console.log("Loading profile for user ID:", user.id);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error loading profile:", profileError);
        throw profileError;
      }

      if (profile) {
        setUsername(profile.username || '');
        setAvatarUrl(profile.avatar_url);
      } else {
        // Create profile if it doesn't exist
        const defaultUsername = user.email?.split('@')[0] || 'Usuário';
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ 
            id: user.id, 
            username: defaultUsername,
            avatar_url: null
          });
          
        if (insertError) {
          console.error("Error creating profile:", insertError);
          throw insertError;
        }
        
        setUsername(defaultUsername);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as informações do perfil.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não encontrado. Faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id,
          username,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não encontrado. Faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Você precisa selecionar uma imagem para fazer upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = fileName;

      // Check if avatars bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets?.find((bucket) => bucket.name === "avatars")) {
        await supabase.storage.createBucket("avatars", {
          public: true,
        });
      }

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile with new avatar
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
          username: username || user.email?.split("@")[0] || "Usuário",
        });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);

      toast({
        title: "Avatar atualizado",
        description: "Seu avatar foi atualizado com sucesso.",
      });
    } catch (error: unknown) {
      console.error("Erro ao fazer upload do avatar:", error);
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Não foi possível atualizar o avatar.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading && !username) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Carregando perfil...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <Avatar className="w-24 h-24 border border-border">
          <AvatarImage src={avatarUrl || undefined} alt={username} />
          <AvatarFallback>
            {uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <UserRound className="w-8 h-8" />}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-3 items-center sm:items-start">
          <div className="text-center sm:text-left">
            <p className="font-medium">{username || "Usuário"}</p>
            <p className="text-sm text-muted-foreground">Clique para alterar sua foto</p>
          </div>
          <Button
            variant="outline"
            disabled={uploading}
            onClick={() => document.getElementById("avatar-upload")?.click()}
            className="w-full sm:w-auto"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Enviando..." : "Alterar avatar"}
          </Button>
          <input
            type="file"
            id="avatar-upload"
            accept="image/*"
            className="hidden"
            onChange={uploadAvatar}
            disabled={uploading}
          />
        </div>
      </div>

      <Separator />

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Nome de usuário</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="Seu nome de usuário"
            disabled={loading}
          />
          <p className="text-sm text-muted-foreground">
            Este nome será exibido para outros usuários
          </p>
        </div>

        <Button type="submit" disabled={loading || uploading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
            </span>
          ) : (
            "Salvar alterações"
          )}
        </Button>
      </form>
    </div>
  );
};
