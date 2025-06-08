
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { UnifiedProfileSettings } from "@/components/settings/UnifiedProfileSettings";
import { UnifiedThemeSettings } from "@/components/settings/UnifiedThemeSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { 
  User, 
  Palette, 
  Shield, 
  Bell, 
  Settings as SettingsIcon,
  ChevronRight,
  Sparkles
} from "lucide-react";

type SettingsSection = "profile" | "theme" | "security" | "notifications";

const Settings = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");

  const settingSections = [
    {
      id: "profile" as const,
      title: "Perfil",
      description: "Gerencie suas informações pessoais",
      icon: User,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      badge: null
    },
    {
      id: "theme" as const,
      title: "Aparência",
      description: "Personalize temas e cores",
      icon: Palette,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      badge: "Novo"
    },
    {
      id: "security" as const,
      title: "Segurança",
      description: "Senha e autenticação",
      icon: Shield,
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      badge: null
    },
    {
      id: "notifications" as const,
      title: "Notificações",
      description: "Configure alertas e sons",
      icon: Bell,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      badge: null
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <UnifiedProfileSettings />;
      case "theme":
        return <UnifiedThemeSettings />;
      case "security":
        return <SecuritySettings />;
      case "notifications":
        return <NotificationSettings />;
      default:
        return <UnifiedProfileSettings />;
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-primary/10">
            <SettingsIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
            <p className="text-muted-foreground">
              Personalize sua experiência e gerencie sua conta
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Opções
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {settingSections.map((section) => (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? "default" : "ghost"}
                  className={`w-full justify-start h-auto p-4 relative group transition-all duration-200 ${
                    activeSection === section.id 
                      ? "shadow-md" 
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${section.bgColor} group-hover:scale-110 transition-transform`}>
                      <section.icon className={`h-4 w-4 ${section.color}`} />
                    </div>
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{section.title}</span>
                        {section.badge && (
                          <Badge variant="secondary" className="text-xs px-2 py-0">
                            {section.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {section.description}
                      </p>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform ${
                      activeSection === section.id ? "rotate-90" : ""
                    }`} />
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Card className="min-h-[600px]">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex items-center gap-3">
                {(() => {
                  const currentSection = settingSections.find(s => s.id === activeSection);
                  const Icon = currentSection?.icon || SettingsIcon;
                  return (
                    <>
                      <div className={`p-2 rounded-lg ${currentSection?.bgColor}`}>
                        <Icon className={`h-5 w-5 ${currentSection?.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-xl">
                          {currentSection?.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {currentSection?.description}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="animate-fade-in">
                {renderContent()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
