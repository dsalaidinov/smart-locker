import { useState, useCallback } from 'react';
import { LockerGrid } from './components/LockerGrid';
import { AgentPanel } from './components/AgentPanel';
import { CustomerPanel } from './components/CustomerPanel';
import './App.css';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedLockerId, setSelectedLockerId] = useState<string | undefined>();

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleSelectLocker = useCallback((lockerId: string) => {
    setSelectedLockerId(lockerId);
  }, []);

  const handleClearSelectedLocker = useCallback(() => {
    setSelectedLockerId(undefined);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🔐</span>
            <div>
              <h1>Lockker</h1>
              <p className="tagline">Smart Package Locker Management</p>
            </div>
          </div>
          <div className="header-badge">
            <span className="pulse" />
            Live
          </div>
        </div>
      </header>

      <main className="app-main">
        <LockerGrid
          refreshTrigger={refreshTrigger}
          selectedLockerId={selectedLockerId}
          onSelectLocker={handleSelectLocker}
        />

        <div className="panels-row">
          <AgentPanel onSuccess={triggerRefresh} />
          <CustomerPanel
            onSuccess={triggerRefresh}
            selectedLockerId={selectedLockerId}
            onClearSelectedLocker={handleClearSelectedLocker}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>Built with Clean Architecture • TypeScript • React</p>
      </footer>
    </div>
  );
}

export default App;
