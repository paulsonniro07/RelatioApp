import { useEffect, useRef } from 'react';

/** Returns a debounced version of `callback` — trailing-edge, resets on each call. */
export function useDebounce<T extends unknown[]>(
  callback: (...args: T) => void,
  delay = 300,
): (...args: T) => void {
  const timerRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (...args: T) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => callbackRef.current(...args), delay);
  };
}
