'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

/**
 * Light/dark toggle. Renders a segmented sun/moon control that slides its
 * highlight — small, tactile, and legible in both themes.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn(
        'relative inline-flex items-center rounded-full border border-border bg-surface-2 p-0.5',
        className,
      )}
    >
      {/* sliding highlight */}
      <span
        aria-hidden
        className={cn(
          'absolute top-0.5 h-6 w-6 rounded-full bg-surface shadow-sm transition-transform duration-200 ease-out',
          theme === 'dark' ? 'translate-x-6' : 'translate-x-0',
        )}
      />
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-pressed={theme === 'light'}
        aria-label="Light mode"
        className={cn(
          'relative z-10 flex h-6 w-6 items-center justify-center rounded-full transition-colors',
          theme === 'light' ? 'text-brand' : 'text-neutral-400 hover:text-neutral-500',
        )}
      >
        <Sun className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-pressed={theme === 'dark'}
        aria-label="Dark mode"
        className={cn(
          'relative z-10 flex h-6 w-6 items-center justify-center rounded-full transition-colors',
          theme === 'dark' ? 'text-brand' : 'text-neutral-400 hover:text-neutral-300',
        )}
      >
        <Moon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
