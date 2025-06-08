
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  toggleView: () => void;
}

const LoginForm = ({ toggleView }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  // Load saved credentials on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("saved_email");
    const savedRememberMe = localStorage.getItem("remember_me") === "true";
    
    if (savedEmail && savedRememberMe) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error("Não foi possível autenticar o usuário.");
      }

      // Save credentials if "Remember me" is checked
      if (rememberMe) {
        localStorage.setItem("saved_email", email);
        localStorage.setItem("remember_me", "true");
      } else {
        localStorage.removeItem("saved_email");
        localStorage.removeItem("remember_me");
      }

      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta!",
      });
    } catch (error: unknown) {
      console.error("Erro ao fazer login:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description:
          (error instanceof Error && error.message === "Email not confirmed")
            ? "Por favor, confirme seu email antes de fazer login."
            : (error instanceof Error ? error.message : "Erro ao fazer login. Verifique suas credenciais."),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 rounded-xl border-muted-foreground/20 focus:border-primary transition-colors"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11 rounded-xl border-muted-foreground/20 focus:border-primary transition-colors pr-10"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="rememberMe"
          checked={rememberMe}
          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
        />
        <Label 
          htmlFor="rememberMe" 
          className="text-sm text-muted-foreground cursor-pointer"
        >
          Mantenha-me conectado
        </Label>
      </div>

      <div className="space-y-3 pt-2">
        <Button
          type="submit"
          className="w-full h-11 rounded-xl font-medium transition-all hover:scale-[1.02]"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Entrando...
            </div>
          ) : (
            "Entrar"
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full h-11 rounded-xl font-medium hover:bg-muted/50 transition-colors"
          onClick={toggleView}
        >
          Não tem uma conta? <span className="text-primary ml-1">Crie aqui</span>
        </Button>
      </div>
    </form>
  );
};

export default LoginForm;
