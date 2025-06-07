
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  CreditCard, 
  Target, 
  Users, 
  MessageSquare, 
  Settings,
  Heart,
  LogOut
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { signOut } = useAuth();
  const { toast } = useToast();

  const mainButtons = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Transações", href: "/transactions", icon: CreditCard },
    { label: "Metas", href: "/goals", icon: Target },
    { label: "Clientes", href: "/clients", icon: Users },
    { label: "Chat", href: "/chat", icon: MessageSquare },
    { label: "Configurações", href: "/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer logout.",
        variant: "destructive",
      });
    }
  };

  return (
    <footer className="border-t-4 border-border/70 bg-background/95 backdrop-blur-md py-2">
      <div className="w-full max-w-7xl mx-auto px-3">
        {/* Main Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 mb-2">
          {mainButtons.map((button) => (
            <Link
              key={button.href}
              to={button.href}
              className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-accent transition-colors group"
            >
              <button.icon className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {button.label}
              </span>
            </Link>
          ))}
        </div>

        <Separator className="my-1.5" />

        {/* Secondary Links and Logout */}
        <div className="flex flex-wrap justify-between items-center gap-2 mb-1.5 text-[10px]">
          <div className="flex flex-wrap gap-2">
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              Sobre
            </Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
              Contato
            </Link>
            <Link to="/support" className="text-muted-foreground hover:text-foreground transition-colors">
              Suporte
            </Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              Privacidade
            </Link>
          </div>
          
          {/* Logout Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3 w-3 mr-1" />
            Sair
          </Button>
        </div>

        {/* Bottom section */}
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-1 sm:space-y-0 text-center">
          <p className="text-[10px] text-muted-foreground">
            © {currentYear} CandleLife. Todos os direitos reservados.
          </p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            Feito com <Heart className="h-2.5 w-2.5 text-red-500" fill="currentColor" /> para você
          </p>
        </div>
      </div>
    </footer>
  );
};
