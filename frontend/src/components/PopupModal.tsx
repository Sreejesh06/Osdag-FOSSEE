import type { ReactNode } from 'react';

interface PopupModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}

export function PopupModal({ title, isOpen, onClose, children, width = '560px' }: PopupModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__body" style={{ width }}>
        <header className="modal__header">
          <h3>{title}</h3>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close popup">
                  x
          </button>
        </header>
        <div className="modal__content">{children}</div>
      </div>
    </div>
  );
}
