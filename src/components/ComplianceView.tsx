import { useState, useEffect } from 'react';
import { Shield, ArrowLeft, Download, Trash2, Filter } from 'lucide-react';
import { AuditLogEntry, ClientSpace } from '../types';
import { getAuditLogs, getClientSpaces, clearAuditLogs, exportAuditLogsCSV } from '../services/spaceRouter';

interface ComplianceViewProps {
  onBack: () => void;
}

export default function ComplianceView({ onBack }: ComplianceViewProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [spaces, setSpaces] = useState<ClientSpace[]>([]);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterSpace, setFilterSpace] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLogs(getAuditLogs());
    setSpaces(getClientSpaces());
  };

  const handleExportCSV = () => {
    const csvContent = exportAuditLogsCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vaultmind_compliance_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearLogs = () => {
    if (confirm('Are you sure you want to clear the audit logs? This action is irreversible and should only be performed in accord with your organizational retention protocols.')) {
      clearAuditLogs();
      loadData();
    }
  };

  // Filtering logic
  const filteredLogs = logs.filter(log => {
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesSpace = filterSpace === 'all' || log.spaceId === filterSpace;
    return matchesAction && matchesSpace;
  });

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'space_created':
        return 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40';
      case 'memory_added':
        return 'bg-blue-950/40 text-blue-400 border border-blue-900/40';
      case 'query_run':
        return 'bg-purple-950/40 text-purple-400 border border-purple-900/40';
      default:
        return 'bg-charcoal-800 text-charcoal-300 border border-charcoal-700';
    }
  };

  const formatActionName = (action: string) => {
    return action.toUpperCase().replace('_', ' ');
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto px-8 py-10 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b border-charcoal-700 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-charcoal-800 rounded-lg text-charcoal-300 hover:text-charcoal-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-charcoal-100 flex items-center gap-2.5">
              <Shield className="w-6 h-6 text-indigo-400" />
              Compliance Audit Trail
            </h1>
            <p className="text-charcoal-400 text-xs mt-1">
              Metadata-only ledger verifying isolated data lifecycle operations. Content is strictly omitted.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:bg-charcoal-850 disabled:text-charcoal-600 text-white rounded-lg transition flex items-center gap-2 font-medium cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Ledger (CSV)
          </button>
          <button
            onClick={handleClearLogs}
            className="px-4 py-2 text-sm bg-charcoal-800 hover:bg-red-950/30 hover:text-red-400 text-charcoal-300 border border-charcoal-700 hover:border-red-900/50 rounded-lg transition flex items-center gap-2 font-medium cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Purge Trail
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex gap-4 p-4 rounded-xl border border-charcoal-800 bg-charcoal-900/25 mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-charcoal-400 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-charcoal-500" />
          Filters:
        </div>

        <div className="flex gap-4 flex-1">
          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-charcoal-400">Operation:</span>
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="bg-charcoal-800 border border-charcoal-700 rounded px-2.5 py-1 text-xs text-charcoal-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Operations</option>
              <option value="space_created">Space Management</option>
              <option value="memory_added">Memory Ingest</option>
              <option value="query_run">Isolated AI Query</option>
            </select>
          </div>

          {/* Space Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-charcoal-400">Client Space:</span>
            <select
              value={filterSpace}
              onChange={e => setFilterSpace(e.target.value)}
              className="bg-charcoal-800 border border-charcoal-700 rounded px-2.5 py-1 text-xs text-charcoal-200 focus:outline-none focus:border-indigo-500 max-w-[200px] truncate"
            >
              <option value="all">All Spaces</option>
              {spaces.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="text-xs text-charcoal-400 flex items-center">
          Showing {filteredLogs.length} events
        </div>
      </div>

      {/* Ledger Table */}
      <div className="border border-charcoal-800 rounded-xl overflow-hidden bg-charcoal-900/10 flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-charcoal-800 bg-charcoal-900/60 text-charcoal-400 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Operation</th>
                <th className="px-5 py-3.5">Target Client</th>
                <th className="px-5 py-3.5">Metadata Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-850">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-charcoal-800/10 text-charcoal-200">
                  <td className="px-5 py-3.5 font-mono text-charcoal-400 select-text whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide font-mono ${getActionBadgeColor(log.action)}`}>
                      {formatActionName(log.action)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-serif font-medium text-charcoal-300">
                    {log.spaceName || 'System-wide'}
                  </td>
                  <td className="px-5 py-3.5 text-charcoal-400 max-w-sm truncate select-text" title={log.details}>
                    {log.details || 'Lifecycle trigger'}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-charcoal-500">
                    No compliance audit records matched your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
