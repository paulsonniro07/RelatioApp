import { useEffect } from 'react';

let lockCount = 0;
let originalOverflow = '';
let savedScrollX = 0;
let savedScrollY = 0;

/**
 * Reference-counted body scroll lock.
 *
 * Multiple overlays (modal, bottom sheet, side panel) can be open at once, so a
 * naive save/restore of `body.style.overflow` per component can leave the page
 * permanently locked. Counting locks guarantees the original value is restored
 * only once the last overlay closes. The scroll position captured on first lock
 * is restored too, so mobile keyboard/focus scroll (which can push the header
 * off-screen) is undone when the last overlay closes.
 */
export function useBodyScrollLock(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow;
      savedScrollX = window.scrollX;
      savedScrollY = window.scrollY;
    }
    lockCount += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = originalOverflow;
        window.scrollTo(savedScrollX, savedScrollY);
      }
    };
  }, [open]);
}
