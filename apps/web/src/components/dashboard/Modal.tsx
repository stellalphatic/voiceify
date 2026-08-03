import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type ModalSize = 'sm' | 'md' | 'lg';

/**
 * Shared dialog behaviour: body scroll lock, Escape to dismiss, focus restore,
 * and click-outside that ignores drags starting inside the panel.
 */
function useDialogBehaviour(open: boolean, onClose: () => void) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const pressStartedInsideRef = useRef(false);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Let nested poppers (comboboxes, menus) consume Escape first.
      if (event.defaultPrevented) return;
      onClose();
    };

    // Compensate for the vanishing scrollbar so the page behind does not jump.
    const { body, documentElement } = document;
    const gutter = window.innerWidth - documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    body.style.overflow = 'hidden';
    if (gutter > 0) body.style.paddingRight = `${gutter}px`;

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
      restoreFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    pressStartedInsideRef.current = Boolean(
      surfaceRef.current?.contains(event.target as Node),
    );
  }, []);

  // Only dismiss when press and release both land on the backdrop, so text
  // selections that drift out of the panel do not close the dialog.
  const onClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      if (pressStartedInsideRef.current) return;
      onClose();
    },
    [onClose],
  );

  return { surfaceRef, onPointerDown, onClick };
}

/**
 * Portal-mounted backdrop for dialogs that supply their own panel markup.
 * Use `Modal` instead whenever the standard head/body/foot shell fits.
 */
export function ModalShell({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: (surfaceRef: React.RefObject<HTMLDivElement | null>) => ReactNode;
}) {
  const { surfaceRef, onPointerDown, onClick } = useDialogBehaviour(open, onClose);
  if (!open) return null;

  return createPortal(
    <div
      className="vfy-modal-backdrop vfy-modal-backdrop--animate"
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      {children(surfaceRef)}
    </div>,
    document.body,
  );
}

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  description?: string;
  tone?: 'default' | 'danger';
  size?: ModalSize;
  /** Leading visual in the header, e.g. a connector brand mark. */
  icon?: ReactNode;
  /** Rendered in the pinned footer bar. */
  footer?: ReactNode;
  /** When provided the body + footer are wrapped in a form element. */
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  /** Hide the header close button (destructive dialogs that need a deliberate choice). */
  hideClose?: boolean;
  children: ReactNode;
};

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'vfy-modal--sm',
  md: 'vfy-modal--md',
  lg: 'vfy-modal--lg',
};

/**
 * Portal-mounted dialog. Rendering into document.body keeps the fixed overlay
 * out of reach of layout constraints such as `.vfy-route-view > *`, which would
 * otherwise clamp the backdrop to the content column width.
 */
export default function Modal({
  open,
  onClose,
  title,
  eyebrow,
  description,
  tone = 'default',
  size = 'md',
  icon,
  footer,
  onSubmit,
  hideClose = false,
  children,
}: ModalProps) {
  const { surfaceRef, onPointerDown, onClick } = useDialogBehaviour(open, onClose);
  const titleId = useId();
  const descriptionId = useId();

  if (!open) return null;

  const body = (
    <>
      <div className="vfy-modal-body">{children}</div>
      {footer ? <div className="vfy-modal-foot">{footer}</div> : null}
    </>
  );

  return createPortal(
    <div
      className="vfy-modal-backdrop vfy-modal-backdrop--animate"
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <div
        ref={surfaceRef}
        className={`vfy-modal vfy-modal--animate ${SIZE_CLASS[size]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className="vfy-modal-head">
          {icon ? <span className="vfy-modal-head-icon">{icon}</span> : null}
          <div className="vfy-modal-head-text">
            {eyebrow ? (
              <p
                className={`vfy-modal-eyebrow${tone === 'danger' ? ' vfy-modal-eyebrow--danger' : ''}`}
              >
                {eyebrow}
              </p>
            ) : null}
            <h2 className="vfy-modal-title" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className="vfy-modal-desc" id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          {hideClose ? null : (
            <button
              type="button"
              className="vfy-modal-close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {onSubmit ? (
          <form className="vfy-modal-form" onSubmit={onSubmit}>
            {body}
          </form>
        ) : (
          body
        )}
      </div>
    </div>,
    document.body,
  );
}
