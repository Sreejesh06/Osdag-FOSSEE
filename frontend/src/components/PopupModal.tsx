import type { ReactNode } from 'react';

interface PopupModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: string;
  variant?: 'standard' | 'edge';
  anchor?: 'left' | 'right';
}

export function PopupModal({
  title,
  isOpen,
  onClose,
  children,
  width = '560px',
  variant = 'standard',
  anchor = 'left',
}: PopupModalProps) {
  if (!isOpen) {
    return null;
  }

  const isEdge = variant === 'edge';
  const classNames = ['modal'];
  if (isEdge) {
    classNames.push('modal--edge', `modal--edge-${anchor}`);
  }

  return (
    <div className={classNames.join(' ')} role="dialog" aria-modal={!isEdge}>
      {!isEdge && <div className="modal__backdrop" onClick={onClose} />}
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
