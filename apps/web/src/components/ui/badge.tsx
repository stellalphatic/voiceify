import * as React from 'react';
import { cn } from '@/lib/utils';

export type BadgeProps = React.HTMLAttributes<HTMLDivElement>;

function Badge({ className, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-none border border-[rgba(255,255,255,0.10)] bg-[#1A1E23] px-2.5 py-0.5 text-xs font-semibold text-[#F0F2F5]',
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
