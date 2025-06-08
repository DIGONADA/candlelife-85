
import { Check, CheckCheck } from "lucide-react";

interface MessageStatusProps {
  status: "sent" | "delivered" | "read";
  showDelivered?: boolean;
}

export const MessageStatus = ({ status, showDelivered = true }: MessageStatusProps) => {
  if (status === "sent") {
    return <Check className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />;
  }

  if (status === "delivered" && showDelivered) {
    return <CheckCheck className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />;
  }

  if (status === "read") {
    return <CheckCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />;
  }

  return null;
};
