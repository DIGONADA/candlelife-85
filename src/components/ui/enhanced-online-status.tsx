
import { cn } from "@/lib/utils";

interface EnhancedOnlineStatusProps {
  status: 'online' | 'offline' | 'away' | 'typing';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const EnhancedOnlineStatus = ({ 
  status, 
  size = 'md', 
  showLabel = false,
  className 
}: EnhancedOnlineStatusProps) => {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  const statusConfig = {
    online: {
      color: 'bg-green-500',
      label: 'Online',
      animation: 'animate-pulse'
    },
    offline: {
      color: 'bg-gray-400',
      label: 'Offline',
      animation: ''
    },
    away: {
      color: 'bg-yellow-500',
      label: 'Ausente',
      animation: ''
    },
    typing: {
      color: 'bg-blue-500',
      label: 'Digitando...',
      animation: 'animate-pulse'
    }
  };

  const config = statusConfig[status];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div 
          className={cn(
            "rounded-full border-2 border-background",
            sizeClasses[size],
            config.color,
            config.animation
          )}
        />
        {status === 'online' && (
          <div 
            className={cn(
              "absolute inset-0 rounded-full bg-green-500 opacity-30 animate-ping",
              sizeClasses[size]
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
