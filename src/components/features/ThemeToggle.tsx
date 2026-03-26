'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';

function SunIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v2.25M12 18.75V21M4.22 4.22l1.59 1.59M18.19 18.19l1.59 1.59M3 12h2.25M18.75 12H21M4.22 19.78l1.59-1.59M18.19 5.81l1.59-1.59M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12.79A9 9 0 1111.21 3c-.08.33-.12.67-.12 1.02a9 9 0 009.91 8.77z"
      />
    </svg>
  );
}

function ThemeIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v2.25M12 18.75V21M4.22 4.22l1.59 1.59M18.19 18.19l1.59 1.59M3 12h2.25M18.75 12H21M4.22 19.78l1.59-1.59M18.19 5.81l1.59-1.59"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  useEffect(() => {
    setMounted(true);
  }, []);

  const label = mounted ? `Switch to ${nextTheme} mode` : 'Toggle color mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-accent min-w-[44px] min-h-[44px] flex items-center justify-center"
      aria-label={label}
      title={label}
    >
      {!mounted ? <ThemeIcon /> : theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
