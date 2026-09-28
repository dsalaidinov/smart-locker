import { useState, useCallback } from 'react';
import type { StoreResult } from '../api';
import { storePackage } from '../api';
import { useAsyncAction } from '../hooks/useAsyncAction';

interface AgentPanelProps {
  onSuccess: () => void;
}

export function AgentPanel({ onSuccess }: AgentPanelProps) {
  const [selectedSize, setSelectedSize] = useState('SMALL');

  const action = useCallback(
    () => storePackage(selectedSize),
    [selectedSize],
  );

  const { result, error, loading, execute } = useAsyncAction<StoreResult>(
    action,
    onSuccess,
  );

  return (
    <div className="panel agent-panel">
      <div className="panel-header">
        <h2>🚚 Delivery Agent</h2>
        <p className="panel-subtitle">Deposit a package into the station</p>
      </div>

      <div className="panel-body">
        <label htmlFor="package-size" className="field-label">
          Package Size
        </label>
        <select
          id="package-size"
          className="select-input"
          value={selectedSize}
          onChange={(e) => setSelectedSize(e.target.value)}
        >
          <option value="SMALL">📦 Small</option>
          <option value="MEDIUM">📫 Medium</option>
          <option value="LARGE">🏗️ Large</option>
        </select>

        <button
          className="btn btn-primary"
          onClick={execute}
          disabled={loading}
        >
          {loading ? (
            <span className="btn-loading">
              <span className="spinner-small" /> Depositing...
            </span>
          ) : (
            '📥 Deposit Package'
          )}
        </button>

        {result && (
          <div className="result-card success">
            <h3>✅ Package Stored!</h3>
            <div className="result-details">
              <div className="detail-row">
                <span className="detail-label">Locker ID</span>
                <span className="detail-value mono">{result.lockerId}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Pickup Code</span>
                <span className="detail-value mono highlight">{result.pickupCode}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Package ID</span>
                <span className="detail-value mono">{result.packageId}</span>
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
    </div>
  );
}
