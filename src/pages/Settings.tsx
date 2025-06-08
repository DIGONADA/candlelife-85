
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UnifiedProfileSettings } from "@/components/settings/UnifiedProfileSettings";
import { UnifiedThemeSettings } from "@/components/settings/UnifiedThemeSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { useGlobalChatListener } from "@/hooks/useGlobalChatListener";

const Settings = () => {
  useGlobalChatListener();

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Gerencie suas preferências e configurações da conta.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-12">
          <TabsTrigger value="profile" className="text-sm md:text-base">
            Perfil
          </TabsTrigger>
          <TabsTrigger value="theme" className="text-sm md:text-base">
            Tema
          </TabsTrigger>
          <TabsTrigger value="security" className="text-sm md:text-base">
            Segurança
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-sm md:text-base">
            Notificações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Perfil e Avatar</CardTitle>
              <CardDescription className="text-base">
                Gerencie suas informações pessoais e foto de perfil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UnifiedProfileSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Personalização</CardTitle>
              <CardDescription className="text-base">
                Escolha o tema e personalize a aparência do aplicativo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UnifiedThemeSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
