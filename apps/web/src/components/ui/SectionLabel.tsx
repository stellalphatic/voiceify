import React from 'react';
import { cn } from '../../lib/utils';

interface SectionLabelProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * SectionLabel — small pill badge used above section headings.
 * Optionally accepts an icon (lucide-react element).
 */
export default function SectionLabel({ children, icon, className }: SectionLabelProps) {
  return (
    <div className={cn('section-label', className)}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </div>
  );
}
