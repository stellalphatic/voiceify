import * as React from 'react';
import { cn } from '@/lib/utils';

type SheetContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return <SheetContext.Provider value={{ open, setOpen: onOpenChange }}>{children}</SheetContext.Provider>;
}

function SheetTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
}) {
  const ctx = React.useContext(SheetContext);
  if (!ctx) return children;
  const child = React.Children.only(children);
  if (!asChild) {
    return (
      <button type="button" onClick={() => ctx.setOpen(true)}>
        {children}
      </button>
    );
  }
  return React.cloneElement(child, {
    onClick: () => ctx.setOpen(true),
  });
}

function SheetContent({
  side = 'left',
  className,
  children,
}: {
  side?: 'left' | 'right';
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(SheetContext);
  if (!ctx || !ctx.open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        aria-label="Close menu overlay"
        className="absolute inset-0 bg-[var(--color-bg-overlay)]"
        onClick={() => ctx.setOpen(false)}
      />
      <div
        className={cn(
          'absolute top-0 h-full w-[280px] bg-[var(--color-bg-card)] border-[var(--color-border)] p-4 transition-transform duration-200',
          side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export { Sheet, SheetTrigger, SheetContent };
