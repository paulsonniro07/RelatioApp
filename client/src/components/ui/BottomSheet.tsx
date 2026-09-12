import { type ReactNode } from 'react';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  useBodyScrollLock(open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/40" onMouseDown={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chart actions"
        className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-6 shadow-xl"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" aria-hidden="true" />
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </div>
  );
}
