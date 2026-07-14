import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

export interface PricingTier {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref?: string;
  popular?: boolean;
}

interface PricingCardProps {
  plan: PricingTier;
  className?: string;
}

/**
 * PricingCard — used in PricingPage and LandingPage pricing section.
 * Highlights the popular tier with an accent border and glow badge.
 */
export default function PricingCard({ plan, className }: PricingCardProps) {
  const ctaHref = plan.ctaHref ?? '/auth?mode=signup';

  return (
    <div
      className={cn(
        'relative p-8 rounded-3xl border flex flex-col transition-all duration-300',
        'hover:-translate-y-2 hover:shadow-2xl',
        plan.popular
          ? 'border-voice-accent bg-voice-accent/5 hover:shadow-voice-accent/20'
          : 'border-voice-frost-border bg-voice-surface hover:border-voice-accent/30 hover:shadow-voice-accent/5',
        className,
      )}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-voice-accent text-voice-bg px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg shadow-voice-accent/30">
          Most Popular
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-xl font-bold mb-2 text-voice-text">{plan.name}</h3>
        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-4xl font-bold text-voice-text">{plan.price}</span>
          {plan.period && (
            <span className="text-voice-muted text-sm">{plan.period}</span>
          )}
        </div>
        <p className="text-voice-muted text-sm leading-relaxed">{plan.description}</p>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <div
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                plan.popular
                  ? 'bg-voice-accent/20 text-voice-accent'
                  : 'bg-voice-frost text-voice-text',
              )}
            >
              <Check className="w-3 h-3" />
            </div>
            <span className="text-voice-muted">{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        to={ctaHref}
        className={cn(
          'w-full py-3.5 rounded-xl font-bold text-center transition-all flex items-center justify-center gap-2',
          plan.popular
            ? 'bg-voice-accent hover:bg-voice-accent-hover text-voice-bg shadow-lg shadow-voice-accent/25'
            : 'bg-voice-bg/50 hover:bg-voice-bg/80 text-voice-text border border-voice-frost-border',
        )}
      >
        {plan.cta}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
