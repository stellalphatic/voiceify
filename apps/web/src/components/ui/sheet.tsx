import * as React from 'react';
import { createPortal } from 'react-dom';
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
  const open = Boolean(ctx?.open);
  const setOpen = ctx?.setOpen;

  React.useEffect(() => {
    if (!open || !setOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) setOpen(false);
    };
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      body.style.overflow = prevOverflow;
    };
  }, [open, setOpen]);

  if (!open || !setOpen) return null;

  // Portalled so ancestor layout constraints cannot clamp the fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <button
        aria-label="Close menu overlay"
        className="absolute inset-0 bg-[var(--color-bg-overlay)] backdrop-blur-[3px]"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'absolute top-0 h-full w-[280px] overflow-y-auto bg-[var(--color-bg-card)] border-[var(--color-border)] p-4 shadow-2xl',
          side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export { Sheet, SheetTrigger, SheetContent };
