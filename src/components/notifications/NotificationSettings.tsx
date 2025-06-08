
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, Volume2, TestTube, Play } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { enhancedNotificationSoundService } from '@/services/enhancedNotificationSound';

export const NotificationSettings = () => {
  const { setSoundEnabled, requestPermissions, getPermissions } = useNotifications();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    sound: true,
    systemNotifications: false,
  });

  useEffect(() => {
    const permissions = getPermissions();
    setSettings(prev => ({
      ...prev,
      sound: permissions.sound,
      systemNotifications: permissions.notifications
    }));
  }, [getPermissions]);

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    enhancedNotificationSoundService.setEnabled(enabled);
    setSettings(prev => ({ ...prev, sound: enabled }));
    toast({
      title: enabled ? 'Som ativado' : 'Som desativado',
      description: enabled ? 'Você receberá notificações sonoras' : 'Notificações sonoras desativadas'
    });
  };

  const handleRequestPermissions = async () => {
    const granted = await requestPermissions();
    setSettings(prev => ({ ...prev, systemNotifications: granted }));
    
    if (granted) {
      toast({
        title: 'Permissões concedidas',
        description: 'Você receberá notificações do sistema'
      });
    } else {
      toast({
        title: 'Permissões negadas',
        description: 'Ative as notificações nas configurações do navegador',
        variant: 'destructive'
      });
    }
  };

  const testNotification = () => {
    if (settings.systemNotifications) {
      new Notification('Teste de Notificação', {
        body: 'Esta é uma notificação de teste do CandleLife',
        icon: '/favicon.ico'
      });
    } else {
      toast({
        title: 'Teste de Notificação',
        description: 'Esta seria uma notificação do sistema'
      });
    }
  };

  const testSound = async () => {
    try {
      await enhancedNotificationSoundService.testSound();
      toast({
        title: 'Som testado',
        description: 'O som de notificação foi reproduzido com sucesso'
      });
    } catch (error) {
      toast({
        title: 'Erro no som',
        description: 'Não foi possível reproduzir o som de notificação',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* System Notifications Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações do Sistema
          </CardTitle>
          <CardDescription>
            Configure as notificações que aparecem no seu sistema operacional
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="system-notifications">Notificações do Sistema</Label>
              <p className="text-sm text-muted-foreground">
                Receba notificações mesmo quando o app estiver em segundo plano
              </p>
            </div>
            <div className="flex items-center gap-2">
              {settings.systemNotifications ? (
                <Badge variant="default">Ativado</Badge>
              ) : (
                <Badge variant="secondary">Desativado</Badge>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {!settings.systemNotifications && (
              <Button onClick={handleRequestPermissions} className="flex-1">
                Ativar Notificações do Sistema
              </Button>
            )}

            {settings.systemNotifications && (
              <Button onClick={testNotification} variant="outline" className="flex-1">
                <TestTube className="h-4 w-4 mr-2" />
                Testar Notificação
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sound Notifications Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Notificações Sonoras
          </CardTitle>
          <CardDescription>
            Configure os sons de notificação para novas mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="sound-notifications">Som de Notificação</Label>
              <p className="text-sm text-muted-foreground">
                Reproduzir som quando receber novas mensagens
              </p>
            </div>
            <Switch
              id="sound-notifications"
              checked={settings.sound}
              onCheckedChange={handleSoundToggle}
            />
          </div>

          {settings.sound && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Testar Som</Label>
                <p className="text-sm text-muted-foreground">
                  Clique no botão abaixo para testar o som de notificação
                </p>
                <Button
                  onClick={testSound}
                  variant="outline"
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Testar Som de Notificação
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Behavior Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Comportamento das Notificações</CardTitle>
          <CardDescription>
            Como as notificações funcionam no aplicativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p>Notificações aparecem apenas quando você está fora do chat</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p>Sons são reproduzidos automaticamente para novas mensagens</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p>Notificações do sistema persistem por 5 segundos</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p>Clique na notificação para abrir a conversa</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

