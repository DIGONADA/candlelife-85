
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, X } from 'lucide-react';

export const NotificationPermissionBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasAsked, setHasAsked] = useState(false);

  useEffect(() => {
    // Verificar se já pedimos permissão ou se já foi concedida
    const hasAskedBefore = localStorage.getItem('notification-permission-asked');
    const notificationPermission = 'Notification' in window ? Notification.permission : 'denied';
    
    // Mostrar banner se não pedimos antes e a permissão não foi concedida
    if (!hasAskedBefore && notificationPermission === 'default') {
      setTimeout(() => {
        setIsVisible(true);
      }, 3000); // Mostrar após 3 segundos
    }
  }, []);

  const handleRequestPermission = async () => {
    setHasAsked(true);
    localStorage.setItem('notification-permission-asked', 'true');
    
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setIsVisible(false);
        }
      }
    } catch (error) {
      console.warn('Failed to request notification permission:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('notification-permission-asked', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm animate-slide-in">
      <Card className="bg-primary text-primary-foreground shadow-lg border-0">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 mt-1 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <h4 className="font-medium text-sm">
                Ativar Notificações
              </h4>
              <p className="text-xs opacity-90">
                Receba notificações sonoras e push quando alguém te enviar uma mensagem.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleRequestPermission}
                  disabled={hasAsked}
                  className="text-xs h-7"
                >
                  {hasAsked ? 'Aguardando...' : 'Ativar'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-xs h-7 text-primary-foreground/80 hover:text-primary-foreground"
                >
                  Agora não
                </Button>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDismiss}
              className="h-6 w-6 text-primary-foreground/80 hover:text-primary-foreground"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
