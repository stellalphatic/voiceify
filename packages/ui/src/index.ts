import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Placeholder re-export surface for shared React primitives (Phase 6). */
export const UI_PACKAGE = "@voiceify/ui" as const;
