
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Bell, Volume2, TestTube, Play } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';

const notificationSounds = [
  { id: 'beep', name: 'Beep Simples', description: 'Som básico de notificação' },
  { id: 'chime', name: 'Chime Suave', description: 'Som melodioso e suave' },
  { id: 'ding', name: 'Ding Clássico', description: 'Som clássico de sino' },
  { id: 'bell', name: 'Sino Tradicional', description: 'Som de sino tradicional' },
  { id: 'ping', name: 'Ping Moderno', description: 'Som moderno e discreto' },
  { id: 'alert', name: 'Alerta Forte', description: 'Som mais alto e chamativo' },
];

export const NotificationSettings = () => {
  const { setSoundEnabled, requestPermissions, getPermissions } = useNotifications();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    sound: true,
    systemNotifications: false,
    selectedSound: 'beep'
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
    setSettings(prev => ({ ...prev, sound: enabled }));
    toast({
      title: enabled ? 'Som ativado' : 'Som desativado',
      description: enabled ? 'Você receberá notificações sonoras' : 'Notificações sonoras desativadas'
    });
  };

  const handleSoundChange = (soundId: string) => {
    setSettings(prev => ({ ...prev, selectedSound: soundId }));
    // Save to localStorage for persistence
    localStorage.setItem('notification_sound', soundId);
    toast({
      title: 'Som alterado',
      description: `Som de notificação alterado para ${notificationSounds.find(s => s.id === soundId)?.name}`
    });
  };

  const testSound = (soundId: string) => {
    // Play the selected sound for testing
    const sound = notificationSounds.find(s => s.id === soundId);
    toast({
      title: 'Testando som',
      description: `Reproduzindo: ${sound?.name}`
    });
    // Here you would actually play the sound
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
                <Label>Escolha o Som</Label>
                <p className="text-sm text-muted-foreground">
                  Selecione o som que será reproduzido nas notificações
                </p>
              </div>
              
              <RadioGroup
                value={settings.selectedSound}
                onValueChange={handleSoundChange}
                className="space-y-3"
              >
                {notificationSounds.map((sound) => (
                  <div key={sound.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value={sound.id} id={sound.id} />
                      <div className="space-y-1">
                        <Label htmlFor={sound.id} className="text-sm font-medium">
                          {sound.name}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {sound.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => testSound(sound.id)}
                      className="ml-2"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </RadioGroup>
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
