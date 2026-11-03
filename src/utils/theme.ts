import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'codestrom-theme';

export function getStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'system';
}

export function systemTheme(): ResolvedTheme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? systemTheme() : mode;
}

let transitionTimer: number | undefined;

export function applyTheme(mode: ThemeMode): void {
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  /* Briefly enable a reduced-motion-safe colour cross-fade while tokens swap. */
  root.classList.add('theme-transition');
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  if (transitionTimer !== undefined) window.clearTimeout(transitionTimer);
  transitionTimer = window.setTimeout(() => root.classList.remove('theme-transition'), 260);
}

export function setStoredTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  applyTheme(mode);
}

/* Lightweight external store so every mounted toggle stays in sync. */
let currentMode: ThemeMode | null = null;
const listeners = new Set<(mode: ThemeMode) => void>();
let mediaBound = false;

function bindSystemListener(): void {
  if (mediaBound) return;
  mediaBound = true;
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => {
      if (currentMode === 'system') applyTheme('system');
    });
  } catch {
    /* ignore */
  }
}

export function getThemeMode(): ThemeMode {
  if (currentMode === null) {
    currentMode = getStoredTheme();
    bindSystemListener();
  }
  return currentMode;
}

export function useTheme(): [ThemeMode, (mode: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>(getThemeMode);

  useEffect(() => {
    const listener = (next: ThemeMode) => setMode(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const update = useCallback((next: ThemeMode) => {
    setStoredTheme(next);
    currentMode = next;
    listeners.forEach((listener) => listener(next));
  }, []);

  return [mode, update];
}
