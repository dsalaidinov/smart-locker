import { useEffect } from 'react';
import type { RetrieveResult } from '../api';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: RetrieveResult | null;
}

export function ReceiptModal({ isOpen, onClose, result }: ReceiptModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !result) {
    return null;
  }

  const formatCurrency = (cents: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(cents / 100);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge-success">Success</span>
            <h3 id="modal-title">Package Retrieved & Locker Unlocked</h3>
          </div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-summary-box">
            <div className="summary-item">
              <span className="summary-label">Locker Compartment</span>
              <span className="summary-value mono">{result.lockerId}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Package Identifier</span>
              <span className="summary-value mono">{result.packageId}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Storage Duration</span>
              <span className="summary-value">
                {result.durationDays} day{result.durationDays !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="summary-item highlight-fee">
              <span className="summary-label">Total Storage Fee</span>
              <span className="summary-value fee">
                {formatCurrency(result.totalStorageFee, result.currency)}
              </span>
            </div>
          </div>

          <div className="modal-info-note">
            <p className="note-text">
              🔒 <strong>Status:</strong> Compartment {result.lockerId} is unlocked and reset to <code>AVAILABLE</code>.
            </p>
            <p className="note-subtext">
              The 6-character pickup code has been permanently invalidated (single-use).
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary modal-action-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
