import * as React from 'react';
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
  if (!ctx || !ctx.open) return null;

  return (
    <div className="fixed inset-0 z-[110]">
      <button
        aria-label="Close dialog overlay"
        className="absolute inset-0 bg-black/60"
        onClick={() => ctx.setOpen(false)}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={cn('w-full max-w-xl rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#131619] p-6', className)}>{children}</div>
      </div>
    </div>
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-1 mb-4', className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold text-[#F9FAFB]', className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-[#9CA3AF]', className)} {...props} />;
}

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription };
