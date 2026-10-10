import { useSyncExternalStore } from 'react';
import { tokens } from '@/styles/generated/tokens';

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** True from the `bp.lg` token up, the breakpoint where the shell switches to a persistent sidebar. */
export const useIsDesktop = () => useMediaQuery(`(min-width: ${tokens['bp-lg']})`);
