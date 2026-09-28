import { useEffect, useState } from 'react';
import type { LockerView } from '../api';
import { fetchLockers } from '../api';

interface LockerGridProps {
  refreshTrigger: number;
  selectedLockerId?: string;
  onSelectLocker?: (lockerId: string) => void;
}

export function LockerGrid({
  refreshTrigger,
  selectedLockerId,
  onSelectLocker,
}: LockerGridProps) {
  const [lockers, setLockers] = useState<LockerView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = await fetchLockers();
        if (!ignore) {
          setLockers(data);
        }
      } catch {
        console.error('Failed to load lockers');
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [refreshTrigger]);

  const sizeGroups = {
    SMALL: lockers.filter((l) => l.size === 'SMALL'),
    MEDIUM: lockers.filter((l) => l.size === 'MEDIUM'),
    LARGE: lockers.filter((l) => l.size === 'LARGE'),
  };

  const sizeEmoji: Record<string, string> = {
    SMALL: '📦',
    MEDIUM: '📫',
    LARGE: '🏗️',
  };

  if (loading) {
    return (
      <div className="locker-grid-loading">
        <div className="spinner" />
        <p>Loading station...</p>
      </div>
    );
  }

  return (
    <div className="locker-grid">
      <div className="grid-header">
        <div>
          <h2>📍 Station Overview</h2>
          <p className="grid-subtitle">Real-time status of all compartments. Click any locker to target it.</p>
        </div>
        <div className="grid-stats">
          <span className="stat available">
            {lockers.filter((l) => l.status === 'AVAILABLE').length} Available
          </span>
          <span className="stat occupied">
            {lockers.filter((l) => l.status === 'OCCUPIED').length} Occupied
          </span>
        </div>
      </div>

      {(Object.entries(sizeGroups) as [string, LockerView[]][]).map(([size, group]) => (
        <div key={size} className="size-row">
          <h3 className="size-label">
            {sizeEmoji[size]} {size}
            <span className="size-count">({group.length})</span>
          </h3>
          <div className="locker-cards">
            {group.map((locker) => {
              const isSelected = selectedLockerId === locker.id;
              return (
                <div
                  key={locker.id}
                  className={`locker-card ${locker.status.toLowerCase()} ${
                    isSelected ? 'selected' : ''
                  }`}
                  onClick={() => onSelectLocker?.(locker.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectLocker?.(locker.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  title={`Click to select ${locker.id}`}
                >
                  <div className="locker-id">{locker.id}</div>
                  <div className={`status-badge ${locker.status.toLowerCase()}`}>
                    {locker.status === 'AVAILABLE' ? '🟢' : '🔴'} {locker.status}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
