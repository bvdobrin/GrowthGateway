import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const ASSET_DETAIL = /^\/assets\/(?!new$)[^/]+$/;

type LibraryPlace = { href: string; scrollY: number };

let libraryPlace: LibraryPlace = { href: '/assets', scrollY: 0 };
const historyPositions = new Map<string, number>();
let ignoreScroll = false;
/** Scroll position we still intend to reach once the page is tall enough. */
let pendingScroll: number | null = null;

/** Last library URL, including filters, so asset pages can return to the same view. */
export const libraryReturnTo = () => libraryPlace.href;

function remember(pathname: string, search: string, key: string, scrollY: number) {
  if (ignoreScroll) return;
  if (pendingScroll !== null && scrollY + 1 < pendingScroll) return;
  historyPositions.set(key, scrollY);
  if (pathname === '/assets') libraryPlace = { href: `${pathname}${search}`, scrollY };
}

function scrollTo(top: number) {
  ignoreScroll = true;
  window.scrollTo({ top, left: 0, behavior: 'instant' });
  ignoreScroll = false;
}

/**
 * New pages open at the top. Returning from an asset to the library, including
 * the browser back button, restores the library position from before that visit.
 */
export function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousPath = useRef(location.pathname);

  useLayoutEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);

  useLayoutEffect(() => {
    const path = location.pathname;
    const previous = previousPath.current;
    const pathnameChanged = path !== previous;
    if (!pathnameChanged && navigationType !== 'POP') return;

    const returningToLibrary = pathnameChanged && path === '/assets' && ASSET_DETAIL.test(previous);
    let top = 0;
    if (navigationType === 'POP') {
      top = historyPositions.get(location.key) ?? (returningToLibrary ? libraryPlace.scrollY : 0);
    } else if (returningToLibrary) {
      top = libraryPlace.scrollY;
    }

    pendingScroll = top > 0 ? top : null;
    scrollTo(top);
    previousPath.current = path;

    if (pendingScroll === null || window.scrollY + 1 >= pendingScroll) {
      pendingScroll = null;
      return;
    }

    let frames = 0;
    let frame = 0;
    const retry = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      frames += 1;
      if (max + 1 >= pendingScroll! || frames > 8) {
        scrollTo(pendingScroll!);
        pendingScroll = null;
        remember(location.pathname, location.search, location.key, window.scrollY);
        return;
      }
      frame = requestAnimationFrame(retry);
    };
    frame = requestAnimationFrame(retry);
    return () => cancelAnimationFrame(frame);
  }, [location.key, location.pathname, location.search, navigationType]);

  useLayoutEffect(() => {
    const onScroll = () => remember(location.pathname, location.search, location.key, window.scrollY);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.key, location.pathname, location.search]);

  return null;
}
