import { Lock, ShieldAlert } from 'lucide-react';
import { getSettings } from '../services/spaceRouter';

export default function PanicLockOverlay() {
  const settings = getSettings();
  const shortcut = settings.panicShortcut || 'Ctrl+L';

  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-charcoal-950/80 backdrop-blur-[28px] select-none animate-fade-in"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <div className="flex flex-col items-center max-w-sm w-full p-8 rounded-2xl bg-charcoal-900/60 border border-charcoal-700/80 shadow-2xl text-center backdrop-blur-md">
        
        {/* Lock Icon Shield */}
        <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-5 mx-auto relative">
          <Lock className="w-6 h-6 text-indigo-400" />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-indigo-500" />
        </div>

        {/* Brand Wordmark */}
        <h1 className="font-serif text-xl font-bold text-charcoal-100 tracking-tight">
          VaultMind
        </h1>
        
        {/* Subtitle / Status */}
        <div className="mt-2 px-3 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[9px] font-bold text-indigo-300 uppercase tracking-widest inline-flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-indigo-400" />
          <span>Boundaries Encapsulated</span>
        </div>

        <p className="mt-4 text-xs text-charcoal-400 leading-relaxed max-w-xs">
          Client isolation layers are frozen. No memory records are visible.
        </p>

        {/* Instruction badge */}
        <div className="mt-6 px-4 py-2 rounded-xl bg-charcoal-800 border border-charcoal-700/80 text-xs font-mono text-indigo-400 font-semibold shadow-inner">
          Press <span className="text-charcoal-100">{shortcut}</span> to resume session
        </div>

      </div>
    </div>
  );
}
