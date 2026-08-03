import * as React from 'react';
import { cn } from '@/lib/utils';

export type BadgeProps = React.HTMLAttributes<HTMLDivElement>;

function Badge({ className, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-transparent bg-[var(--color-bg-tertiary)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-text-primary)]',
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
