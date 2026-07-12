import { useState } from 'react';
import Dashboard from './components/Dashboard';
import SpaceView from './components/SpaceView';
import ComplianceView from './components/ComplianceView';
import SettingsView from './components/SettingsView';
import MemoryCaptureModal from './components/MemoryCaptureModal';
import { ClientSpace } from './types';

type ViewState = 'dashboard' | 'space' | 'compliance' | 'settings';

export default function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [activeSpace, setActiveSpace] = useState<ClientSpace | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [timelineVersion, setTimelineVersion] = useState(0);

  const handleSelectSpace = (space: ClientSpace) => {
    setActiveSpace(space);
    setView('space');
  };

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
