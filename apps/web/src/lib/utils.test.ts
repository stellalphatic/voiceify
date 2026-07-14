import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn (class-name merge utility)', () => {
  it('joins simple class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });

  it('respects twMerge precedence (last wins for conflicting Tailwind classes)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles arrays and objects (clsx behavior)', () => {
    expect(cn(['a', 'b'], { c: true, d: false })).toBe('a b c');
  });
});
