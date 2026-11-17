import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RefreshCcw } from "lucide-react";

import { Button } from "./Button";
import { cn } from "../lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("empty-state", className)}>
      <div className="empty-icon">{icon ?? <Inbox size={26} />}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Ada yang nyangkut",
  message,
  onRetry,
  retryLabel = "Coba lagi",
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("error-state", className)} role="alert">
      <div className="error-icon">
        <AlertTriangle size={22} />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCcw size={15} />}
          onClick={onRetry}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
