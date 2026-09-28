import { useState, useCallback } from 'react';
import type { RetrieveResult } from '../api';
import { retrievePackage } from '../api';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { ReceiptModal } from './ReceiptModal';

interface CustomerPanelProps {
  onSuccess: () => void;
  selectedLockerId?: string;
  onClearSelectedLocker?: () => void;
}

export function CustomerPanel({
  onSuccess,
  selectedLockerId,
  onClearSelectedLocker,
}: CustomerPanelProps) {
  const [lockerId, setLockerId] = useState('');
  const [pickupCode, setPickupCode] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [prevSelected, setPrevSelected] = useState(selectedLockerId);
  if (selectedLockerId && selectedLockerId !== prevSelected) {
    setPrevSelected(selectedLockerId);
    setLockerId(selectedLockerId);
  }

  const handleSuccess = useCallback(() => {
    setIsModalOpen(true);
    onSuccess();
    onClearSelectedLocker?.();
  }, [onSuccess, onClearSelectedLocker]);

  const action = useCallback(
    () => retrievePackage(lockerId.trim(), pickupCode.trim().toUpperCase()),
    [lockerId, pickupCode],
  );

  const { result, error, loading, execute } = useAsyncAction<RetrieveResult>(
    action,
    handleSuccess,
  );

  const handleRetrieve = useCallback(() => {
    if (!lockerId.trim() || !pickupCode.trim()) {
      return;
    }
    void execute();
  }, [lockerId, pickupCode, execute]);

  const formatCurrency = (cents: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(cents / 100);
  };

  return (
    <div className="panel customer-panel">
      <div className="panel-header">
        <h2>👤 Customer Pickup</h2>
        <p className="panel-subtitle">Retrieve your package and view charges</p>
      </div>

      <div className="panel-body">
        <label htmlFor="locker-id" className="field-label">
          Locker ID
        </label>
        <input
          id="locker-id"
          type="text"
          className="text-input"
          placeholder="e.g., S1 (or click an occupied locker above)"
          value={lockerId}
          onChange={(e) => setLockerId(e.target.value)}
        />

        <label htmlFor="pickup-code" className="field-label">
          Pickup Code
        </label>
        <input
          id="pickup-code"
          type="text"
          className="text-input mono"
          placeholder="e.g., ABC123"
          value={pickupCode}
          onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
          maxLength={6}
        />

        <button
          className="btn btn-secondary"
          onClick={handleRetrieve}
          disabled={loading || !lockerId.trim() || !pickupCode.trim()}
        >
          {loading ? (
            <span className="btn-loading">
              <span className="spinner-small" /> Unlocking...
            </span>
          ) : (
            '🔓 Unlock & Pay'
          )}
        </button>

        {result && (
          <div className="result-card success">
            <div className="result-card-header">
              <h3>✅ Package Retrieved!</h3>
              <button
                className="btn-link"
                onClick={() => setIsModalOpen(true)}
                type="button"
              >
                View Full Receipt Modal ↗
              </button>
            </div>
            <div className="result-details">
              <div className="detail-row">
                <span className="detail-label">Locker</span>
                <span className="detail-value mono">{result.lockerId}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Package</span>
                <span className="detail-value mono">{result.packageId}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Duration</span>
                <span className="detail-value">
                  {result.durationDays} day{result.durationDays !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="detail-row highlight-row">
                <span className="detail-label">Total Fee</span>
                <span className="detail-value fee">
                  {formatCurrency(result.totalStorageFee, result.currency)}
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="result-card error">
            <h3>❌ Error</h3>
            <p>{error}</p>
          </div>
        )}
      </div>

      <ReceiptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        result={result}
      />
    </div>
  );
}
