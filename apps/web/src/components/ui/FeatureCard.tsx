import React from 'react';
import { cn } from '../../lib/utils';

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  /** Optional Tailwind text-color class for the icon, e.g. "text-voice-feature-latency" */
  iconColor?: string;
  className?: string;
}

/**
 * FeatureCard — used in FeaturesPage and LandingPage features grid.
 * Hover lifts with an accent border glow.
 */
export default function FeatureCard({
  icon: Icon,
  title,
  description,
  iconColor = 'text-voice-accent',
  className,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        'bg-voice-surface p-8 rounded-3xl border border-voice-frost-border',
        'hover:border-voice-accent/40 hover:-translate-y-1 hover:shadow-xl',
        'hover:shadow-voice-accent/10 transition-all duration-300 group',
        className,
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-voice-bg border border-voice-frost-border flex items-center justify-center mb-6 group-hover:border-voice-frost-strong transition-colors">
        <Icon className={cn('w-7 h-7', iconColor)} />
      </div>
      <h3 className="text-xl font-bold mb-3 text-voice-text">{title}</h3>
      <p className="text-voice-muted leading-relaxed">{description}</p>
    </div>
  );
}
