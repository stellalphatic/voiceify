import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type DialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>{children}</DialogContext.Provider>;
}

function DialogTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
}) {
  const ctx = React.useContext(DialogContext);
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

function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(DialogContext);
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
    <div className="fixed inset-0 z-[110]">
      <button
        aria-label="Close dialog overlay"
        className="absolute inset-0 bg-[var(--color-bg-overlay)] backdrop-blur-[3px]"
        onClick={() => setOpen(false)}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'pointer-events-auto w-full max-w-xl max-h-full overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-2xl',
            className,
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-1 mb-4', className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold text-[var(--color-text-primary)]', className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-[var(--color-text-muted)]', className)} {...props} />;
}

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription };
