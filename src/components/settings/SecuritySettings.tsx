
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Shield, KeyRound, AlertTriangle, Smartphone, LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionsManager } from "./SessionsManager";
import { TwoFactorManager } from "./TwoFactorManager";
import { Separator } from "@/components/ui/separator";

export const SecuritySettings = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  type SecurityOptionProps = {
    icon: LucideIcon;
    title: string;
    description: string;
    action: string;
    onClick: () => void;
  };

  const SecurityOption = ({ icon: Icon, title, description, action, onClick }: SecurityOptionProps) => (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-1 text-primary" />
        <div className="flex-1">
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onClick}>
        {action}
      </Button>
    </div>
  );

  if (activeSection === "sessions") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSection(null)}
            >
              ← Voltar
            </Button>
          </div>
          <CardTitle>Sessões Ativas</CardTitle>
          <CardDescription>
            Gerencie os dispositivos que estão conectados à sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionsManager />
        </CardContent>
      </Card>
    );
  }

  if (activeSection === "2fa") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSection(null)}
            >
              ← Voltar
            </Button>
          </div>
          <CardTitle>Verificação em Duas Etapas</CardTitle>
          <CardDescription>
            Configure uma camada extra de segurança para sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TwoFactorManager />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Segurança
        </CardTitle>
        <CardDescription>
          Gerencie suas configurações de segurança e privacidade.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SecurityOption
          icon={KeyRound}
          title="Senha"
          description="Altere sua senha para manter sua conta segura"
          action="Alterar"
          onClick={() => navigate("/change-password")}
        />

        <Separator />

        <SecurityOption
          icon={Smartphone}
          title="Verificação em duas etapas"
          description="Adicione uma camada extra de segurança à sua conta"
          action="Configurar"
          onClick={() => setActiveSection("2fa")}
        />

        <Separator />

        <SecurityOption
          icon={AlertTriangle}
          title="Sessões ativas"
          description="Visualize e gerencie dispositivos conectados à sua conta"
          action="Gerenciar"
          onClick={() => setActiveSection("sessions")}
        />
      </CardContent>
    </Card>
  );
};
