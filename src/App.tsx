import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import SpaceView from './components/SpaceView';
import ComplianceView from './components/ComplianceView';
import SettingsView from './components/SettingsView';
import MemoryCaptureModal from './components/MemoryCaptureModal';
import { ClientSpace } from './types';
import { getSettings } from './services/spaceRouter';
import { AlertTriangle } from 'lucide-react';

type ViewState = 'dashboard' | 'space' | 'compliance' | 'settings';

export default function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [activeSpace, setActiveSpace] = useState<ClientSpace | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [timelineVersion, setTimelineVersion] = useState(0);
  const [securityViolation, setSecurityViolation] = useState<string | null>(null);

  // Load and apply the saved theme mode on boot
  useEffect(() => {
    const settings = getSettings();
    if (settings.theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }

    // Startup Guard: localhost-only Supermemory URL check
    const url = settings.supermemoryUrl || '';
    const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('[::1]');
    if (!isLocalhost && settings.mode === 'live') {
      setSecurityViolation(`CRITICAL SECURITY FAILURE: VaultMind is configured to point to a remote Supermemory URL (${url}). Under zero-cloud containment guidelines, only localhost connections are permitted. Boot aborted.`);
    }
  }, []);

  const handleSelectSpace = (space: ClientSpace) => {
    setActiveSpace(space);
    setView('space');
  };

  if (securityViolation) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-charcoal-900 text-charcoal-100 p-6">
        <div className="max-w-md w-full bg-red-950/20 border border-red-900/50 p-6 rounded-2xl flex flex-col items-center gap-4 text-center shadow-lg">
          <AlertTriangle className="w-12 h-12 text-red-500 animate-pulse" />
          <h2 className="font-serif text-lg font-bold text-red-200">Zero-Cloud Security Violation</h2>
          <p className="text-xs text-charcoal-400 leading-relaxed">
            {securityViolation}
          </p>
          <div className="text-[10px] text-charcoal-500 uppercase tracking-widest mt-2 border-t border-charcoal-800/80 pt-3 w-full">
            Vaultmind Security Guard Active
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        '--client-accent': activeSpace ? activeSpace.color : 'transparent'
      } as React.CSSProperties}
      className={`h-screen w-screen flex flex-col overflow-hidden bg-charcoal-900 text-charcoal-100 select-none ${
        activeSpace ? 'active-border-frame transition-all-300' : ''
      }`}
    >
      {/* View router */}
      <div className="flex-1 overflow-hidden">
        {view === 'dashboard' && (
          <Dashboard
            onSelectSpace={handleSelectSpace}
            onNavigateToCompliance={() => setView('compliance')}
            onNavigateToSettings={() => setView('settings')}
          />
        )}
        
        {view === 'space' && activeSpace && (
          <SpaceView
            space={activeSpace}
            onBack={() => {
              setView('dashboard');
              setActiveSpace(null);
            }}
            onOpenAddMemory={() => setShowAddModal(true)}
            timelineVersion={timelineVersion}
          />
        )}

        {view === 'compliance' && (
          <ComplianceView onBack={() => setView('dashboard')} />
        )}

        {view === 'settings' && (
          <SettingsView onBack={() => setView('dashboard')} />
        )}
      </div>

      {/* Memory Capture Modal */}
      {showAddModal && activeSpace && (
        <MemoryCaptureModal
          space={activeSpace}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => setTimelineVersion(prev => prev + 1)}
        />
      )}
    </div>
  );
}
