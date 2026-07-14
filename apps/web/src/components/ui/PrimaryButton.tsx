import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface PrimaryButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
  disabled?: boolean;
  id?: string;
}

/**
 * PrimaryButton — accent-filled CTA with shimmer hover effect.
 * Renders as a <Link> when `href` is provided, otherwise a <button>.
 */
export default function PrimaryButton({
  children,
  href,
  onClick,
  type = 'button',
  className,
  disabled,
  id,
}: PrimaryButtonProps) {
  const classes = cn(
    'btn btn-primary shimmer',
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
