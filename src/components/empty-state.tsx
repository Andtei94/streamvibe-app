
import { cn } from '@/lib/utils';
import React from 'react';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("text-center py-20 flex flex-col items-center justify-center", className)}>
      <Icon className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
