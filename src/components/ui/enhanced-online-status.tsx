
import { cn } from "@/lib/utils";

interface EnhancedOnlineStatusProps {
  status: 'online' | 'offline' | 'away' | 'typing';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  className?: string;
  animate?: boolean;
}

export const EnhancedOnlineStatus = ({ 
  status, 
  size = 'md', 
  showLabel = false,
  className,
  animate = true
}: EnhancedOnlineStatusProps) => {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
    xl: 'h-5 w-5'
  };

  const statusConfig = {
    online: {
      color: 'bg-green-500 shadow-green-500/50',
      label: 'Online',
      animation: animate ? 'animate-pulse' : '',
      ring: 'ring-green-500/30'
    },
    offline: {
      color: 'bg-gray-400 shadow-gray-400/50',
      label: 'Offline',
      animation: '',
      ring: 'ring-gray-400/30'
    },
    away: {
      color: 'bg-yellow-500 shadow-yellow-500/50',
      label: 'Ausente',
      animation: animate ? 'animate-pulse' : '',
      ring: 'ring-yellow-500/30'
    },
    typing: {
      color: 'bg-blue-500 shadow-blue-500/50',
      label: 'Digitando...',
      animation: animate ? 'animate-pulse' : '',
      ring: 'ring-blue-500/30'
    }
  };

  const config = statusConfig[status];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div 
          className={cn(
            "rounded-full border-2 border-background shadow-lg transition-all duration-300",
            sizeClasses[size],
            config.color,
            config.animation
          )}
        />
        {(status === 'online' || status === 'typing') && animate && (
          <div 
            className={cn(
              "absolute inset-0 rounded-full opacity-20 animate-ping",
              sizeClasses[size],
              config.color.split(' ')[0]
            )}
          />
        )}
        {status === 'online' && (
          <div 
            className={cn(
              "absolute -inset-1 rounded-full ring-2 opacity-30",
              config.ring
            )}
          />
        )}
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground font-medium">
          {config.label}
        </span>
      )}
    </div>
  );
};
