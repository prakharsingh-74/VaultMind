import { useState } from 'react';
import { Settings, Shield, Server, Key, AlertTriangle, ArrowLeft, RefreshCw, Check, Sun, Moon } from 'lucide-react';
import { AppSettings, LLMProvider, AppMode } from '../types';
import { getSettings, saveSettings, logAuditAction } from '../services/spaceRouter';
import { safeFetch as fetch } from '../services/safeFetch';

interface SettingsViewProps {
  onBack: () => void;
}

export default function SettingsView({ onBack }: SettingsViewProps) {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [isSaved, setIsSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testError, setTestError] = useState('');

  const handleSave = (newSettings: AppSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
    setIsSaved(true);
    logAuditAction('space_created', undefined, undefined, `Updated App Settings (Mode: ${newSettings.mode}, LLM: ${newSettings.llmProvider})`);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleModeChange = (mode: AppMode) => {
    const next = { ...settings, mode };
    handleSave(next);
  };

  const handleProviderChange = (llmProvider: LLMProvider) => {
    const next = { ...settings, llmProvider };
    handleSave(next);
  };

  const handleInputChange = (field: keyof AppSettings, value: string) => {
    const next = { ...settings, [field]: value };
    setSettings(next);
  };

  const handleThemeChange = (theme: 'dark' | 'light') => {
    const next = { ...settings, theme };
    handleSave(next);
    // Apply theme class to document element instantly
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  const testSupermemoryConnection = async () => {
    setTestStatus('testing');
    setTestError('');
    try {
      const res = await fetch(`${settings.supermemoryUrl}/v4/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.supermemoryApiKey ? { 'x-supermemory-api-key': settings.supermemoryApiKey } : {})
        },
        body: JSON.stringify({ q: 'ping', containerTag: 'system_test' })
      });
      if (res.ok) {
        setTestStatus('success');
      } else {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text}`);
      }
    } catch (err: any) {
      setTestStatus('failed');
      setTestError(err.message || 'Connection failed.');
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden px-8 py-6 max-w-4xl mx-auto w-full">
      {/* Header - Fixed Height */}
      <div className="flex items-center justify-between mb-6 border-b border-charcoal-700 pb-5 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-charcoal-800 rounded-lg text-charcoal-300 hover:text-charcoal-100 transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-charcoal-100 flex items-center gap-2.5">
              <Settings className="w-6 h-6 text-indigo-400" />
              System Preferences
            </h1>
            <p className="text-charcoal-400 text-xs mt-1">
              Configure local boundary runtimes, server configurations, and LLM providers.
            </p>
          </div>
        </div>

        {/* Premium Light/Dark Theme Segment Switch */}
        <div className="flex items-center gap-1 bg-charcoal-900 border border-charcoal-700/80 p-1 rounded-xl shadow-inner">
          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              settings.theme !== 'light'
                ? 'bg-charcoal-800 text-indigo-400 border border-charcoal-700 shadow-sm'
                : 'text-charcoal-400 hover:text-charcoal-200'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            Dark
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              settings.theme === 'light'
                ? 'bg-charcoal-800 text-indigo-500 border border-charcoal-700 shadow-sm'
                : 'text-charcoal-400 hover:text-charcoal-200'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            Light
          </button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pr-3 space-y-6 scrollbar-thin">
        {/* Section 1: Execution Mode */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-charcoal-300 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            Security & Execution Mode
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleModeChange('mock')}
              className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between h-28 ${
                settings.mode === 'mock'
                  ? 'bg-indigo-950/10 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-950/5'
                  : 'bg-charcoal-800/40 border-charcoal-700 text-charcoal-400 hover:border-charcoal-600'
              }`}
            >
              <div>
                <div className="font-semibold text-sm text-charcoal-200">Offline Simulation Mode</div>
                <p className="text-[11px] text-charcoal-400 mt-1 leading-normal">
                  No local server needed. Generates answers client-side with keyword similarity lookup. Perfect for instant offline demos.
                </p>
              </div>
              {settings.mode === 'mock' && <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-2 block">Active</span>}
            </button>

            <button
              onClick={() => handleModeChange('live')}
              className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between h-28 ${
                settings.mode === 'live'
                  ? 'bg-indigo-950/10 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-950/5'
                  : 'bg-charcoal-800/40 border-charcoal-700 text-charcoal-400 hover:border-charcoal-600'
              }`}
            >
              <div>
                <div className="font-semibold text-sm text-charcoal-200">Live Supermemory Local Mode</div>
                <p className="text-[11px] text-charcoal-400 mt-1 leading-normal">
                  Connects to a running Supermemory Local binary on port 6767. Utilizes native vector embeddings and isolated namespaces.
                </p>
              </div>
              {settings.mode === 'live' && <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-2 block">Active</span>}
            </button>
          </div>
        </div>

        {/* Section 2: Supermemory Local Configuration */}
        {settings.mode === 'live' && (
          <div className="space-y-4 border-t border-charcoal-700 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-charcoal-300 flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              Supermemory Local Endpoint
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] text-charcoal-400 uppercase font-semibold">Local Server Base URL</label>
                <input
                  type="text"
                  value={settings.supermemoryUrl}
                  onChange={e => handleInputChange('supermemoryUrl', e.target.value)}
                  className="w-full bg-charcoal-900 border border-charcoal-700 rounded px-3 py-1.5 text-sm text-charcoal-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-charcoal-400 uppercase font-semibold">Supermemory API Key</label>
                <input
                  type="password"
                  value={settings.supermemoryApiKey}
                  onChange={e => handleInputChange('supermemoryApiKey', e.target.value)}
                  placeholder="Optional local key..."
                  className="w-full bg-charcoal-900 border border-charcoal-700 rounded px-3 py-1.5 text-sm text-charcoal-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <button
                type="button"
                onClick={testSupermemoryConnection}
                disabled={testStatus === 'testing'}
                className="px-3.5 py-1.5 bg-charcoal-800 hover:bg-charcoal-700 text-charcoal-200 border border-charcoal-600 rounded text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {testStatus === 'testing' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  'Test Connection'
                )}
              </button>

              {testStatus === 'success' && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Connected successfully to localhost:6767
                </span>
              )}
              {testStatus === 'failed' && (
                <span className="text-xs text-red-400 font-medium">
                  Connection failed: {testError}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Section 3: LLM Provider */}
        <div className="space-y-4 border-t border-charcoal-700 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-charcoal-300 flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-400" />
            AI Synthesis LLM Provider
          </h3>

          <div className="grid grid-cols-4 gap-2">
            {(['ollama', 'openai', 'gemini', 'anthropic'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => handleProviderChange(p)}
                className={`py-2 text-xs rounded-lg border font-medium transition cursor-pointer ${
                  settings.llmProvider === p
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-charcoal-900/40 border-charcoal-700 text-charcoal-400 hover:border-charcoal-600'
                }`}
              >
                {p === 'ollama' && 'Ollama (Local)'}
                {p === 'openai' && 'OpenAI'}
                {p === 'gemini' && 'Gemini'}
                {p === 'anthropic' && 'Anthropic'}
              </button>
            ))}
          </div>

          {/* Cloud LLM Warning banner */}
          {settings.llmProvider !== 'ollama' && (
            <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-900/50 flex gap-3 text-xs text-amber-300 leading-relaxed shadow-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">⚠️ Data Privacy Warning: NDA Extraction Compliance</span>
                Memory extraction and summarization will send prompt details to **{settings.llmProvider.toUpperCase()}**'s cloud API. While your vector database embeddings are isolated locally on your device (using containerTag boundaries), generative context processing will transit the local perimeter. Ensure your client NDA contracts permit corporate enterprise integrations with {settings.llmProvider.toUpperCase()}.
              </div>
            </div>
          )}

          {/* Provider Specific Input Forms */}
          <div className="bg-charcoal-900/40 border border-charcoal-800 p-5 rounded-xl space-y-4">
            {settings.llmProvider === 'ollama' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-charcoal-400 uppercase font-semibold">Ollama Local URL</label>
                  <input
                    type="text"
                    value={settings.ollamaUrl}
                    onChange={e => handleInputChange('ollamaUrl', e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full bg-charcoal-900 border border-charcoal-700 rounded px-3 py-1.5 text-sm text-charcoal-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-charcoal-400 uppercase font-semibold">Model Name</label>
                  <input
                    type="text"
                    value={settings.ollamaModel}
                    onChange={e => handleInputChange('ollamaModel', e.target.value)}
                    placeholder="llama3"
                    className="w-full bg-charcoal-900 border border-charcoal-700 rounded px-3 py-1.5 text-sm text-charcoal-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[10px] text-charcoal-400 uppercase font-semibold">
                  {settings.llmProvider.toUpperCase()} API Key
                </label>
                <input
                  type="password"
                  value={settings.llmApiKey}
                  onChange={e => handleInputChange('llmApiKey', e.target.value)}
                  placeholder={`Enter your ${settings.llmProvider.toUpperCase()} api key...`}
                  className="w-full bg-charcoal-900 border border-charcoal-700 rounded px-3 py-1.5 text-sm text-charcoal-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer - Fixed Height Action Bar */}
      <div className="mt-5 border-t border-charcoal-700 pt-4 flex justify-end shrink-0">
        <button
          onClick={() => handleSave(settings)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-950/20"
        >
          {isSaved ? (
            <>
              <Check className="w-4 h-4" />
              Settings Saved
            </>
          ) : (
            'Save Configuration'
          )}
        </button>
      </div>
    </div>
  );
}
