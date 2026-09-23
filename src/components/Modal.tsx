import { X } from 'lucide-react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n';
import { cx } from '../utils/ui';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  dismissible?: boolean;
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' };

export function Modal({ open, onClose, title, children, size = 'md', dismissible = true }: ModalProps) {
  const t = useT();
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div
        className="anim-fade-in absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={dismissible ? onClose : undefined}
      />
      <div
        className={cx(
          'panel anim-pop relative max-h-[92dvh] w-full overflow-y-auto rounded-b-none p-5 sm:rounded-b-[1.25rem] sm:p-6',
          SIZES[size],
        )}
      >
        {(title || dismissible) && (
          <div className="mb-4 flex items-start justify-between gap-4">
            {title ? <h2 className="font-display text-xl font-bold text-white">{title}</h2> : <span />}
            {dismissible && (
              <button
                type="button"
                aria-label={t('common.close')}
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ open, title, message, confirmLabel, tone = 'primary', onConfirm, onCancel }: ConfirmModalProps) {
  const t = useT();
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="text-sm leading-relaxed text-slate-400">{message}</div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button type="button" className="btn btn-ghost h-11" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button
          type="button"
          className={cx('btn h-11', tone === 'danger' ? 'btn-danger' : 'btn-primary')}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
