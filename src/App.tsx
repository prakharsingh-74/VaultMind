import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import SpaceView from './components/SpaceView';
import ComplianceView from './components/ComplianceView';
import SettingsView from './components/SettingsView';
import MemoryCaptureModal from './components/MemoryCaptureModal';
import PanicLockOverlay from './components/PanicLockOverlay';
import { ClientSpace } from './types';
import { getSettings, logAuditAction } from './services/spaceRouter';
import { AlertTriangle } from 'lucide-react';

type ViewState = 'dashboard' | 'space' | 'compliance' | 'settings';

export default function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [activeSpace, setActiveSpace] = useState<ClientSpace | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [timelineVersion, setTimelineVersion] = useState(0);
  const [securityViolation, setSecurityViolation] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

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

  // Panic Lock Keyboard Interceptor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const settings = getSettings();
      const shortcut = settings.panicShortcut || 'Ctrl+L';

      const parts = shortcut.toLowerCase().split('+');
      const needsCtrl = parts.includes('ctrl');
      const needsShift = parts.includes('shift');
      const needsAlt = parts.includes('alt');
      const needsMeta = parts.includes('cmd') || parts.includes('win') || parts.includes('meta');

      const targetKey = parts.find(p => !['ctrl', 'shift', 'alt', 'cmd', 'win', 'meta'].includes(p));
      if (!targetKey) return;

      const matchesCtrl = needsCtrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey;
      const matchesShift = needsShift ? e.shiftKey : !e.shiftKey;
      const matchesAlt = needsAlt ? e.altKey : !e.altKey;
      const matchesMeta = needsMeta ? e.metaKey : !e.metaKey;
      const matchesKey = e.key.toLowerCase() === targetKey;

      if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
        e.preventDefault();
        e.stopPropagation();
        setIsLocked(prev => {
          const next = !prev;
          if (next) {
            logAuditAction('app_locked', undefined, undefined, 'Panic Lock activated via keyboard shortcut');
          } else {
            logAuditAction('app_unlocked', undefined, undefined, 'Panic Lock deactivated via keyboard shortcut');
          }
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);

  // Idle Auto-Lock Timer
  useEffect(() => {
    if (isLocked) return;

    const settings = getSettings();
    const timeoutMin = settings.panicIdleTimeout !== undefined ? settings.panicIdleTimeout : 7;
    if (timeoutMin <= 0) return;

    const timeoutMs = timeoutMin * 60 * 1000;
    let timerId: any;

    const resetTimer = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        setIsLocked(true);
        logAuditAction('app_locked', undefined, undefined, `Panic Lock triggered automatically due to ${timeoutMin} minutes of inactivity`);
      }, timeoutMs);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();

    return () => {
      if (timerId) clearTimeout(timerId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isLocked]);

  const handleSelectSpace = (space: ClientSpace) => {
    setActiveSpace(space);
    setView('space');
  };

  if (securityViolation) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-charcoal-900 text-charcoal-100 p-6">
        <div className="max-w-md w-full badge-danger p-6 rounded-2xl flex flex-col items-center gap-4 text-center shadow-lg">
          <AlertTriangle className="w-12 h-12 text-[var(--status-danger-text)] animate-pulse" />
          <h2 className="font-serif text-lg font-bold text-[var(--status-danger-text)]">Zero-Cloud Security Violation</h2>
          <p className="text-xs text-[var(--status-danger-text)] opacity-90 leading-relaxed">
            {securityViolation}
          </p>
          <div className="text-[10px] uppercase tracking-widest mt-2 border-t border-[rgba(255,255,255,0.1)] pt-3 w-full opacity-85">
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

      {/* Panic Lock Overlay */}
      {isLocked && <PanicLockOverlay />}
    </div>
  );
}
