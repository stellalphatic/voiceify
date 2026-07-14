import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface GhostButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
  disabled?: boolean;
  id?: string;
}

/**
 * GhostButton — outlined secondary CTA with border hover accent.
 * Renders as a <Link> when `href` is provided, otherwise a <button>.
 */
export default function GhostButton({
  children,
  href,
  onClick,
  type = 'button',
  className,
  disabled,
  id,
}: GhostButtonProps) {
  const classes = cn(
    'btn btn-ghost',
    disabled && 'opacity-50 pointer-events-none',
    className,
  );

  if (href) {
    return (
      <Link to={href} className={classes} id={id}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      id={id}
    >
      {children}
    </button>
  );
}
