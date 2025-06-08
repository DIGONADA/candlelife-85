
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Sparkles,
  Zap
} from "lucide-react";

type SettingsSection = "profile" | "theme" | "security" | "notifications";

const Settings = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");

  const settingSections = [
    {
      id: "profile" as const,
      title: "Perfil",
      description: "Gerencie suas informações pessoais e preferências",
      icon: User,
      color: "text-blue-500",
      bgColor: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20",
      badge: null
    },
    {
      id: "theme" as const,
      title: "Aparência",
      description: "Personalize temas, cores e visual",
      icon: Palette,
      color: "text-purple-500",
      bgColor: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20",
      badge: "Novo"
    },
    {
      id: "security" as const,
      title: "Segurança",
      description: "Senha, 2FA e autenticação",
      icon: Shield,
      color: "text-green-500",
      bgColor: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20",
      badge: null
    },
    {
      id: "notifications" as const,
      title: "Notificações",
      description: "Configure alertas, sons e avisos",
      icon: Bell,
      color: "text-orange-500",
      bgColor: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20",
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

  const currentSection = settingSections.find(s => s.id === activeSection);

  return (
    <div className="container mx-auto p-4 max-w-7xl min-h-screen">
      {/* Enhanced Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <SettingsIcon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Configurações
            </h1>
            <p className="text-muted-foreground text-lg mt-1">
              Personalize sua experiência e gerencie sua conta
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Enhanced Sidebar Navigation */}
        <div className="lg:col-span-2">
          <Card className="sticky top-6 border-0 shadow-xl bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                Configurações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-6 pt-0">
              {settingSections.map((section, index) => (
                <div key={section.id} className="animate-slide-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  <Button
                    variant={activeSection === section.id ? "default" : "ghost"}
                    className={`w-full justify-start h-auto p-4 relative group transition-all duration-300 ${
                      activeSection === section.id 
                        ? "shadow-lg scale-[1.02] bg-primary text-primary-foreground" 
                        : "hover:bg-muted/70 hover:scale-[1.01]"
                    }`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-3 rounded-xl transition-all duration-300 ${
                        activeSection === section.id ? section.bgColor : section.bgColor
                      } group-hover:scale-110`}>
                        <section.icon className={`h-5 w-5 ${
                          activeSection === section.id ? section.color : section.color
                        }`} />
                      </div>
                      <div className="text-left flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-base">{section.title}</span>
                          {section.badge && (
                            <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-gradient-to-r from-primary/10 to-primary/5">
                              {section.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs opacity-70 leading-relaxed">
                          {section.description}
                        </p>
                      </div>
                      <ChevronRight className={`h-5 w-5 transition-all duration-300 ${
                        activeSection === section.id ? "rotate-90 text-primary-foreground" : "text-muted-foreground"
                      }`} />
                    </div>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Main Content */}
        <div className="lg:col-span-3">
          <Card className="min-h-[700px] border-0 shadow-xl bg-card/80 backdrop-blur-sm animate-fade-in">
            <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${currentSection?.bgColor}`}>
                  {currentSection?.icon && (
                    <currentSection.icon className={`h-6 w-6 ${currentSection.color}`} />
                  )}
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">
                    {currentSection?.title}
                  </CardTitle>
                  <p className="text-muted-foreground mt-1">
                    {currentSection?.description}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
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
