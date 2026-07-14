/**
 * ThemeToggle — single source of truth via ThemeContext.
 * All instances stay in sync (navbar, auth, dashboard).
 */
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md';
}

export default function ThemeToggle({ className, size = 'md' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const dim = size === 'sm' ? 14 : 18;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={[
        'theme-toggle-btn',
        size === 'sm' ? 'theme-toggle-btn--sm' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-theme-toggle
    >
      {theme === 'dark' ? (
        <Sun size={dim} strokeWidth={2.25} aria-hidden />
      ) : (
        <Moon size={dim} strokeWidth={2.25} aria-hidden />
      )}
    </button>
  );
}
