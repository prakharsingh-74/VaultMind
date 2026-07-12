import { useState, useEffect } from 'react';
import { Plus, Briefcase, Calendar, Database, Trash2, ArrowRight } from 'lucide-react';
import { ClientSpace } from '../types';
import { getClientSpaces, createClientSpace, deleteClientSpace, getSpaceTimeline } from '../services/spaceRouter';

interface DashboardProps {
  onSelectSpace: (space: ClientSpace) => void;
  onNavigateToCompliance: () => void;
  onNavigateToSettings: () => void;
}

const PRESET_COLORS = [
  { name: 'emerald', value: '#10b981', label: 'Emerald' },
  { name: 'crimson', value: '#ef4444', label: 'Crimson' },
  { name: 'indigo', value: '#6366f1', label: 'Indigo' },
  { name: 'amber', value: '#f59e0b', label: 'Amber' },
  { name: 'teal', value: '#14b8a6', label: 'Teal' },
  { name: 'slate', value: '#64748b', label: 'Slate' },
  { name: 'plum', value: '#a855f7', label: 'Plum' },
];

export default function Dashboard({ onSelectSpace, onNavigateToCompliance, onNavigateToSettings }: DashboardProps) {
  const [spaces, setSpaces] = useState<ClientSpace[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceColor, setNewSpaceColor] = useState(PRESET_COLORS[0].value);
  const [spaceCounts, setSpaceCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = () => {
    const list = getClientSpaces();
    setSpaces(list);
    
    // Load counts for each space
    const counts: Record<string, number> = {};
    list.forEach(s => {
      counts[s.id] = getSpaceTimeline(s.id).length;
    });
    setSpaceCounts(counts);
  };

  const handleCreateSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;

    createClientSpace(newSpaceName.trim(), newSpaceColor);
    setNewSpaceName('');
    setShowCreateForm(false);
    loadSpaces();
  };

  const handleDeleteSpace = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you absolutely sure you want to delete this client space? All stored memories and documents for this client will be permanently destroyed.')) {
      deleteClientSpace(id);
      loadSpaces();
    }
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto px-8 py-10 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-charcoal-100 flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-indigo-400" />
            Vaultmind
          </h1>
          <p className="text-charcoal-300 text-sm mt-2">
            Confidential, Locally-Partitioned AI Memory. Zero cloud leakage.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={onNavigateToCompliance}
            className="px-4 py-2 text-sm bg-charcoal-800 hover:bg-charcoal-700 text-charcoal-200 border border-charcoal-600 rounded-lg transition"
          >
            Compliance Log
          </button>
          <button
            onClick={onNavigateToSettings}
            className="px-4 py-2 text-sm bg-charcoal-800 hover:bg-charcoal-700 text-charcoal-200 border border-charcoal-600 rounded-lg transition"
          >
            Settings
          </button>
        </div>
      </div>

      {/* Grid of Client Spaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {/* Create Card Button */}
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="h-48 border border-dashed border-charcoal-600 rounded-xl flex flex-col items-center justify-center gap-3 bg-charcoal-900/50 hover:bg-charcoal-800/40 hover:border-indigo-500/50 transition duration-300 group cursor-pointer"
          >
            <div className="p-3 bg-charcoal-800 rounded-full group-hover:bg-indigo-950 group-hover:text-indigo-400 transition">
              <Plus className="w-6 h-6 text-charcoal-300 group-hover:text-indigo-400" />
            </div>
            <span className="text-charcoal-300 font-medium group-hover:text-indigo-300">Create Client Space</span>
            <span className="text-xs text-charcoal-500 max-w-[200px] text-center">Establish a new isolated, encrypted workspace under NDA</span>
          </button>
        ) : (
          <form
            onSubmit={handleCreateSpace}
            className="h-48 border border-charcoal-600 rounded-xl p-5 bg-charcoal-800 flex flex-col justify-between"
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">New Client Space</div>
              <input
                autoFocus
                type="text"
                value={newSpaceName}
                onChange={e => setNewSpaceName(e.target.value)}
                placeholder="Client/Project Name..."
                className="w-full bg-charcoal-900 border border-charcoal-600 rounded px-3 py-1.5 text-sm text-charcoal-100 placeholder-charcoal-500 focus:outline-none focus:border-indigo-500"
              />
              
              {/* Color Preset Selector */}
              <div className="flex gap-2 mt-4">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setNewSpaceColor(color.value)}
                    className={`w-6 h-6 rounded-full border-2 transition ${newSpaceColor === color.value ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1 text-xs text-charcoal-400 hover:text-charcoal-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition"
              >
                Create Space
              </button>
            </div>
          </form>
        )}

        {/* Existing Spaces */}
        {spaces.map(space => (
          <div
            key={space.id}
            onClick={() => onSelectSpace(space)}
            style={{ '--client-accent': space.color } as React.CSSProperties}
            className="h-48 glass-panel glass-panel-hover rounded-xl p-5 flex flex-col justify-between transition-all-300 cursor-pointer group relative overflow-hidden"
          >
            {/* Color accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 client-bg-active" />

            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-serif text-lg font-medium text-charcoal-100 group-hover:client-text-active transition-colors truncate max-w-[80%]">
                  {space.name}
                </h3>
                <button
                  onClick={(e) => handleDeleteSpace(space.id, e)}
                  className="p-1 text-charcoal-500 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition"
                  title="Delete Client Space"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 mt-2.5">
                <span className="w-2.5 h-2.5 rounded-full client-bg-active" />
                <span className="text-xs text-charcoal-400 font-mono tracking-wide">{space.containerTag}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-charcoal-700/60">
              <div className="flex gap-4">
                <div className="flex items-center gap-1 text-charcoal-400">
                  <Database className="w-3.5 h-3.5" />
                  <span className="text-xs">{spaceCounts[space.id] || 0} memories</span>
                </div>
                <div className="flex items-center gap-1 text-charcoal-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs">{new Date(space.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-charcoal-500 group-hover:translate-x-1 transition group-hover:client-text-active" />
            </div>
          </div>
        ))}
      </div>

      {spaces.length === 0 && !showCreateForm && (
        <div className="flex flex-col items-center justify-center py-12 border border-charcoal-700/50 rounded-xl bg-charcoal-900/20 text-center">
          <Briefcase className="w-12 h-12 text-charcoal-600 mb-4" />
          <h4 className="text-charcoal-300 font-medium mb-1">No Client Spaces Found</h4>
          <p className="text-charcoal-500 text-xs max-w-sm">
            Create your first client workspace to start cataloging notes, transcripts, and emails securely.
          </p>
        </div>
      )}
    </div>
  );
}
