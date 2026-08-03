import * as React from 'react';
import { cn } from '@/lib/utils';

type AccordionContextValue = {
  value: string | null;
  setValue: (value: string | null) => void;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);
const AccordionItemContext = React.createContext<string | null>(null);

interface AccordionProps {
  type?: 'single';
  collapsible?: boolean;
  defaultValue?: string;
  className?: string;
  children: React.ReactNode;
}

function Accordion({ defaultValue, className, children }: AccordionProps) {
  const [value, setValue] = React.useState<string | null>(defaultValue ?? null);
  return (
    <AccordionContext.Provider value={{ value, setValue }}>
      <div className={cn('w-full', className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

type AccordionItemProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
};

function AccordionItem({ value, className, children, ...props }: AccordionItemProps) {
  return (
    <AccordionItemContext.Provider value={value}>
      <div className={cn('border-b border-[var(--color-border)]', className)} {...props}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const accordion = React.useContext(AccordionContext);
  const itemValue = React.useContext(AccordionItemContext);
  if (!accordion || !itemValue) return null;
  const isOpen = accordion.value === itemValue;

  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center justify-between py-4 text-left text-[var(--color-text-primary)] font-medium',
        className,
      )}
      onClick={() => accordion.setValue(isOpen ? null : itemValue)}
      {...props}
    >
      {children}
      <span className={cn('transition-transform', isOpen ? 'rotate-45' : 'rotate-0')}>+</span>
    </button>
  );
}

function AccordionContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const accordion = React.useContext(AccordionContext);
  const itemValue = React.useContext(AccordionItemContext);
  if (!accordion || !itemValue) return null;
  const isOpen = accordion.value === itemValue;
  if (!isOpen) return null;

  return (
    <div className={cn('pb-4 text-sm text-[var(--color-text-muted)]', className)} {...props}>
      {children}
    </div>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
