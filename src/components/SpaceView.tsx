import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Search, Send, Database, ShieldAlert, Sparkles, FileText, Mail, FileCheck, Edit3, ChevronDown, ChevronUp, Lock, RefreshCw, Layers } from 'lucide-react';
import { ClientSpace, MemoryEntry, AppSettings } from '../types';
import { getSpaceTimeline, querySpace, getClientSpaces, getSettings, logAuditAction } from '../services/spaceRouter';
import { searchSimMemories } from '../services/supermemoryMock';

interface SpaceViewProps {
  space: ClientSpace;
  onBack: () => void;
  onOpenAddMemory: () => void;
  timelineVersion: number; // Trigger reload when memory added
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  citations?: MemoryEntry[];
  isLoading?: boolean;
}

export default function SpaceView({ space, onBack, onOpenAddMemory, timelineVersion }: SpaceViewProps) {
  const [timeline, setTimeline] = useState<MemoryEntry[]>([]);
  const [timelineFilter, setTimelineFilter] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isSearchingChat, setIsSearchingChat] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  
  // Isolation Proof states
  const [otherSpaces, setOtherSpaces] = useState<ClientSpace[]>([]);
  const [selectedProofSpace, setSelectedProofSpace] = useState<string>('');
  const [proofQuery, setProofQuery] = useState('What are the critical deal terms or secret project codes?');
  const [proofRunning, setProofRunning] = useState(false);
  const [proofResultActive, setProofResultActive] = useState<{ answer: string; count: number } | null>(null);
  const [proofResultOther, setProofResultOther] = useState<{ answer: string; count: number } | null>(null);
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTimeline();
    loadOtherSpaces();
    setSettings(getSettings());
  }, [space.id, timelineVersion]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const loadTimeline = () => {
    const items = getSpaceTimeline(space.id);
    setTimeline(items);
  };

  const loadOtherSpaces = () => {
    const list = getClientSpaces().filter(s => s.id !== space.id);
    setOtherSpaces(list);
    if (list.length > 0) {
      setSelectedProofSpace(list[0].id);
    }
  };

  const handleTimelineSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTimelineFilter(val);
    if (!val.trim()) {
      loadTimeline();
    } else {
      // Use mock search scoring locally for timeline filtering
      const scored = searchSimMemories(space.containerTag, val);
      setTimeline(scored.map(s => s.entry));
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isSearchingChat) return;

    const userMsg: ChatMessage = {
      id: `chat_${Date.now()}_u`,
      sender: 'user',
      text: inputQuery
    };
    
    const aiPlaceholder: ChatMessage = {
      id: `chat_${Date.now()}_ai`,
      sender: 'ai',
      text: '',
      isLoading: true
    };

    setChatHistory(prev => [...prev, userMsg, aiPlaceholder]);
    setInputQuery('');
    setIsSearchingChat(true);

    try {
      const response = await querySpace(space.id, userMsg.text);
      
      setChatHistory(prev => prev.map(msg => 
        msg.id === aiPlaceholder.id 
          ? { ...msg, text: response.answer, citations: response.citations, isLoading: false } 
          : msg
      ));
    } catch (err: any) {
      setChatHistory(prev => prev.map(msg => 
        msg.id === aiPlaceholder.id 
          ? { ...msg, text: `Error processing query: ${err.message}`, isLoading: false } 
          : msg
      ));
    } finally {
      setIsSearchingChat(false);
    }
  };

  const runIsolationProofTest = async () => {
    if (!selectedProofSpace || !proofQuery.trim() || proofRunning) return;
    
    setProofRunning(true);
    setProofResultActive(null);
    setProofResultOther(null);

    const otherSpaceObj = otherSpaces.find(s => s.id === selectedProofSpace);
    if (!otherSpaceObj) return;

    logAuditAction('query_run', space.id, space.name, `Running Proof Test vs ${otherSpaceObj.name}`);

    try {
      // Query 1: Active space
      const resActive = await querySpace(space.id, proofQuery);
      setProofResultActive({
        answer: resActive.answer,
        count: resActive.citations.length
      });

      // Query 2: Other space (hard isolated!)
      const resOther = await querySpace(selectedProofSpace, proofQuery);
      setProofResultOther({
        answer: resOther.answer,
        count: resOther.citations.length
      });
    } catch (err: any) {
      console.error('Isolation Proof Test failed:', err);
    } finally {
      setProofRunning(false);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'file': return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'pasted_email': return <Mail className="w-4 h-4 text-amber-400" />;
      case 'meeting_summary': return <FileCheck className="w-4 h-4 text-indigo-400" />;
      default: return <Edit3 className="w-4 h-4 text-charcoal-300" />;
    }
  };

  const getSourceLabel = (type: string) => {
    switch (type) {
      case 'file': return 'File Upload';
      case 'pasted_email': return 'Email Paste';
      case 'meeting_summary': return 'Meeting Transcript';
      default: return 'Client Note';
    }
  };

  return (
    <div
      style={{ '--client-accent': space.color } as React.CSSProperties}
      className="h-full flex flex-col active-border-frame transition-all-300"
    >
      {/* Top Banner Navigation */}
      <div className="h-14 border-b border-charcoal-700/60 bg-charcoal-900 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-charcoal-800 rounded-lg text-charcoal-300 hover:text-charcoal-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="font-serif font-semibold text-charcoal-100">{space.name}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider bg-charcoal-800 text-charcoal-300 border border-charcoal-700">
              {space.containerTag}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Settings / Mode Indicator */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-charcoal-800/80 text-charcoal-300 border border-charcoal-700">
              <span className={`w-1.5 h-1.5 rounded-full ${settings.mode === 'live' ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />
              <span>{settings.mode === 'live' ? 'Live Local DB' : 'Simulated DB'}</span>
            </div>
            {settings.llmProvider !== 'ollama' && (
              <span className="text-[10px] text-amber-500 font-medium">
                Cloud LLM ({settings.llmProvider.toUpperCase()}) Active
              </span>
            )}
          </div>

          <button
            onClick={onOpenAddMemory}
            className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1.5 transition font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Memory
          </button>
        </div>
      </div>

      {/* Main Three Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Pane 1: Memory Timeline (Left) */}
        <div className="w-80 border-r border-charcoal-700/60 bg-charcoal-900/30 flex flex-col">
          <div className="p-3 border-b border-charcoal-700/60 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-2.5 top-2 text-charcoal-500" />
              <input
                type="text"
                placeholder="Filter memory index..."
                value={timelineFilter}
                onChange={handleTimelineSearch}
                className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-charcoal-200"
              />
            </div>
          </div>

          {/* Timeline Scroll */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider mb-2">Memory Timeline ({timeline.length})</div>
            
            {timeline.map(entry => (
              <div
                key={entry.id}
                className="p-3 rounded-lg bg-charcoal-800/60 border border-charcoal-700/50 hover:border-charcoal-600 transition flex flex-col gap-1.5"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    {getSourceIcon(entry.sourceType)}
                    <span className="text-[10px] font-medium text-charcoal-300">{getSourceLabel(entry.sourceType)}</span>
                  </div>
                  <span className="text-[9px] text-charcoal-500">{new Date(entry.createdAt).toLocaleDateString()}</span>
                </div>
                
                {entry.fileName && (
                  <div className="text-[10px] font-mono text-indigo-400 truncate">
                    File: {entry.fileName}
                  </div>
                )}
                
                <p className="text-xs text-charcoal-200 line-clamp-3 whitespace-pre-line leading-relaxed">
                  {entry.rawText}
                </p>

                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {entry.tags.map(tag => (
                      <span key={tag} className="text-[9px] bg-charcoal-700 text-charcoal-300 px-1 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {timeline.length === 0 && (
              <div className="text-center py-8 text-charcoal-500 text-xs">
                {timelineFilter ? 'No matching memories.' : 'Memory database empty. Ingest text or files to begin.'}
              </div>
            )}
          </div>
        </div>

        {/* Pane 2: Chat Terminal (Center) */}
        <div className="flex-1 bg-charcoal-900 flex flex-col overflow-hidden relative">
          {/* Active indicator bar */}
          <div className="absolute top-0 left-0 right-0 h-0.5 client-bg-active opacity-60" />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {chatHistory.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <Database className="w-12 h-12 text-charcoal-600 mb-4" />
                <h2 className="font-serif text-lg text-charcoal-200 font-medium">Scoped Knowledge Interface</h2>
                <p className="text-xs text-charcoal-400 mt-2 leading-relaxed">
                  Ask a question. Answers will be generated **exclusively** from facts and documents indexed inside the <span className="font-semibold text-indigo-400 font-serif">"{space.name}"</span> namespace.
                </p>
                <div className="flex items-center gap-1.5 mt-4 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-3 py-1.5 rounded-lg">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Isolation enforced at the database level</span>
                </div>
              </div>
            )}

            {chatHistory.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className={`text-[10px] font-semibold tracking-wider uppercase mb-1 ${msg.sender === 'user' ? 'text-indigo-400' : 'text-charcoal-400'}`}>
                  {msg.sender === 'user' ? 'Your Query' : 'Isolated AI Response'}
                </div>

                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-charcoal-800 border border-indigo-500/30 text-charcoal-100 font-medium'
                      : 'bg-charcoal-800/40 border border-charcoal-700/60 text-charcoal-200'
                  }`}
                >
                  {msg.isLoading ? (
                    <div className="flex items-center gap-2 text-charcoal-400 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      Retrieving contexts and generating isolated answer...
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>

                {/* Citations */}
                {!msg.isLoading && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2.5 w-full max-w-[85%]">
                    <div className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wide mb-1">Citations ({msg.citations.length})</div>
                    <div className="space-y-1.5">
                      {msg.citations.map((cit, idx) => (
                        <div key={cit.id} className="border border-charcoal-800 bg-charcoal-900/40 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedCitationId(expandedCitationId === cit.id ? null : cit.id)}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs text-charcoal-300 hover:bg-charcoal-800 transition"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-4 h-4 bg-charcoal-800 rounded flex items-center justify-center font-mono text-[9px] text-indigo-400 font-bold">
                                {idx + 1}
                              </span>
                              {getSourceIcon(cit.sourceType)}
                              <span className="truncate font-serif">{getSourceLabel(cit.sourceType)} {cit.fileName ? `(${cit.fileName})` : ''}</span>
                            </div>
                            {expandedCitationId === cit.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {expandedCitationId === cit.id && (
                            <div className="p-3 bg-charcoal-900 border-t border-charcoal-800 text-xs text-charcoal-400 leading-relaxed font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                              {cit.rawText}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            <div ref={chatEndRef} />
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendChat} className="p-4 border-t border-charcoal-700/60 bg-charcoal-900/60 flex gap-3">
            <input
              type="text"
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              placeholder={`Ask anything about ${space.name}...`}
              className="flex-1 bg-charcoal-800 border border-charcoal-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-charcoal-200 placeholder-charcoal-500"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isSearchingChat}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-charcoal-800 disabled:text-charcoal-600 text-white rounded-lg flex items-center justify-center transition font-medium"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Pane 3: Isolation Proof Panel (Right) */}
        <div className="w-96 border-l border-charcoal-700/60 bg-charcoal-900/30 flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b border-charcoal-700/60 flex items-center gap-2 bg-charcoal-950/20">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-charcoal-200">Isolation Proof</h3>
          </div>

          <div className="p-4 space-y-6">
            
            {/* active container tag metadata */}
            <div className="p-4.5 rounded-xl border border-indigo-500/20 bg-indigo-950/10 space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 font-serif font-medium text-sm">
                <Lock className="w-4 h-4" />
                Isolated Namespace
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-charcoal-400 uppercase tracking-wide">Active containerTag:</div>
                <div className="text-xs font-mono bg-charcoal-950/80 border border-charcoal-800 rounded px-2.5 py-1 text-indigo-300 select-all truncate">
                  {space.containerTag}
                </div>
              </div>
              <div className="text-xs text-charcoal-400 leading-relaxed">
                Supermemory Local ensures this tag gets its own vector namespace and knowledge graph. The system cannot cross-index this data.
              </div>
            </div>

            {/* Inaccessible list */}
            <div>
              <div className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider mb-2">Partitioned Client Spaces</div>
              <div className="border border-charcoal-800 rounded-lg overflow-hidden divide-y divide-charcoal-800/80">
                {otherSpaces.map(s => (
                  <div key={s.id} className="p-3 bg-charcoal-900/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="font-serif text-charcoal-300 truncate">{s.name}</span>
                    </div>
                    <span className="text-[10px] text-red-400 font-medium px-2 py-0.5 bg-red-950/20 border border-red-900/30 rounded">
                      Inaccessible
                    </span>
                  </div>
                ))}
                {otherSpaces.length === 0 && (
                  <div className="p-4 text-center text-charcoal-500 text-xs">
                    No other client spaces exist to test partitioning.
                  </div>
                )}
              </div>
            </div>

            {/* Prove Isolation Tool */}
            {otherSpaces.length > 0 && (
              <div className="border border-charcoal-800 bg-charcoal-900/20 rounded-xl p-4.5 space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-200 uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Isolation Validation Test
                </div>
                <p className="text-xs text-charcoal-400 leading-normal">
                  Ask the same question in both this space and another. Verify that the other database fails to return Acme's confidential context.
                </p>

                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-charcoal-400 uppercase">Compare Against:</label>
                    <select
                      value={selectedProofSpace}
                      onChange={e => setSelectedProofSpace(e.target.value)}
                      className="w-full bg-charcoal-800 border border-charcoal-700 rounded px-2 py-1.5 text-xs text-charcoal-200 focus:outline-none focus:border-indigo-500"
                    >
                      {otherSpaces.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.containerTag})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-charcoal-400 uppercase">Test Query:</label>
                    <textarea
                      value={proofQuery}
                      onChange={e => setProofQuery(e.target.value)}
                      placeholder="Ask something confidential..."
                      rows={2}
                      className="w-full bg-charcoal-800 border border-charcoal-700 rounded px-2.5 py-1.5 text-xs text-charcoal-200 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <button
                    onClick={runIsolationProofTest}
                    disabled={proofRunning || !proofQuery.trim()}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-charcoal-800 text-white disabled:text-charcoal-600 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition"
                  >
                    {proofRunning ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Validating boundaries...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Run Dual Queries
                      </>
                    )}
                  </button>
                </div>

                {/* Proof Results Side-by-Side */}
                {(proofResultActive || proofResultOther) && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {/* Active Space */}
                    <div className="border border-indigo-500/20 bg-indigo-950/10 p-2.5 rounded-lg flex flex-col justify-between">
                      <div>
                        <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider truncate mb-1">
                          {space.name} (Active)
                        </div>
                        <p className="text-[11px] text-charcoal-300 leading-normal line-clamp-5 whitespace-pre-wrap select-text">
                          {proofResultActive?.answer || 'Awaiting response...'}
                        </p>
                      </div>
                      <div className="text-[9px] text-indigo-400/80 mt-2 border-t border-indigo-900/30 pt-1.5 font-medium">
                        Citations: {proofResultActive?.count} items
                      </div>
                    </div>

                    {/* Compare Space */}
                    <div className="border border-red-500/20 bg-red-950/10 p-2.5 rounded-lg flex flex-col justify-between">
                      <div>
                        <div className="text-[9px] font-bold text-red-400 uppercase tracking-wider truncate mb-1">
                          {otherSpaces.find(s => s.id === selectedProofSpace)?.name}
                        </div>
                        <p className="text-[11px] text-charcoal-300 leading-normal line-clamp-5 whitespace-pre-wrap select-text">
                          {proofResultOther?.answer || 'Awaiting response...'}
                        </p>
                      </div>
                      <div className="text-[9px] text-red-400/80 mt-2 border-t border-red-900/30 pt-1.5 font-medium">
                        Citations: {proofResultOther?.count} items
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
