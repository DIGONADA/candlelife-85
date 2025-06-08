
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
    <div className="container mx-auto p-4 md:p-6 max-w-5xl">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas preferências e configurações da conta.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4 md:space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
          <TabsTrigger value="profile" className="text-xs md:text-sm">Perfil</TabsTrigger>
          <TabsTrigger value="theme" className="text-xs md:text-sm">Tema</TabsTrigger>
          <TabsTrigger value="security" className="text-xs md:text-sm">Segurança</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs md:text-sm">Notificações</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Perfil e Avatar</CardTitle>
              <CardDescription>
                Gerencie suas informações pessoais e foto de perfil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UnifiedProfileSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personalização</CardTitle>
              <CardDescription>
                Escolha o tema e personalize a aparência do aplicativo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UnifiedThemeSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 md:space-y-6">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>
                Configure como e quando você quer receber notificações.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
