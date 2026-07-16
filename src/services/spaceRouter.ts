import { ClientSpace, MemoryEntry, AuditLogEntry, AppSettings, MemorySourceType } from '../types';
import { addSimMemory, generateSimulatedAnswer, getSimMemories, callLLM } from './supermemoryMock';
import { safeFetch as fetch } from './safeFetch';

const SPACES_KEY = 'vaultmind_client_spaces';
const AUDIT_KEY = 'vaultmind_audit_log';
const SETTINGS_KEY = 'vaultmind_settings';

// Default App Settings
const DEFAULT_SETTINGS: AppSettings = {
  mode: 'mock',
  supermemoryUrl: 'http://localhost:6767',
  supermemoryApiKey: '',
  llmProvider: 'ollama',
  llmApiKey: '',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
  panicLockPinHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // SHA-256 hash of "1234"
  panicShortcut: 'Ctrl+L',
  panicIdleTimeout: 7
};

// --- Settings Operations ---
export function getSettings(): AppSettings {
  const data = localStorage.getItem(SETTINGS_KEY);
  if (!data) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// --- Audit Log Operations ---
export function getAuditLogs(): AuditLogEntry[] {
  const data = localStorage.getItem(AUDIT_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function logAuditAction(action: AuditLogEntry['action'], spaceId?: string, spaceName?: string, details?: string): void {
  const logs = getAuditLogs();
  const newEntry: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    action,
    spaceId,
    spaceName,
    details
  };
  logs.unshift(newEntry); // Newest first
  localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
}

export function clearAuditLogs(): void {
  localStorage.setItem(AUDIT_KEY, JSON.stringify([]));
  logAuditAction('space_created', undefined, undefined, 'Audit log cleared');
}

export function exportAuditLogsCSV(): string {
  const logs = getAuditLogs();
  const headers = ['ID', 'Timestamp', 'Action', 'Space ID', 'Space Name', 'Details'];
  const rows = logs.map(l => [
    l.id,
    l.timestamp,
    l.action,
    l.spaceId || '',
    l.spaceName || '',
    l.details || ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return csvContent;
}

// --- Client Space Operations ---
export function getClientSpaces(): ClientSpace[] {
  const data = localStorage.getItem(SPACES_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function createClientSpace(name: string, color: string, retentionDays?: number): ClientSpace {
  const spaces = getClientSpaces();
  
  // Clean container tag mapping
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const containerTag = `client_${cleanName}_${Math.random().toString(36).substr(2, 5)}`;
  
  const newSpace: ClientSpace = {
    id: `space_${Date.now()}`,
    name,
    color,
    createdAt: new Date().toISOString(),
    containerTag,
    retentionDays
  };
  
  spaces.push(newSpace);
  localStorage.setItem(SPACES_KEY, JSON.stringify(spaces));
  
  logAuditAction('space_created', newSpace.id, newSpace.name, `Created space with tag ${containerTag}`);
  return newSpace;
}

export function deleteClientSpace(spaceId: string): void {
  const spaces = getClientSpaces();
  const spaceToDelete = spaces.find(s => s.id === spaceId);
  if (!spaceToDelete) return;
  
  const filtered = spaces.filter(s => s.id !== spaceId);
  localStorage.setItem(SPACES_KEY, JSON.stringify(filtered));
  
  // Clean up mock database files for that tag
  localStorage.removeItem(`vaultmind_sim_db_${spaceToDelete.containerTag}`);
  
  logAuditAction('space_created', spaceId, spaceToDelete.name, `Deleted space and its database`);
}

// --- Memory & Chat Operations (Space Router Choke Point) ---

// Ingest memory (strictly tags with active containerTag)
export async function addMemory(
  spaceId: string,
  text: string,
  type: MemorySourceType,
  fileName?: string,
  tags: string[] = []
): Promise<MemoryEntry> {
  const spaces = getClientSpaces();
  const space = spaces.find(s => s.id === spaceId);
  if (!space) {
    throw new Error(`Invalid Client Space Selection: Space ID ${spaceId} not found.`);
  }

  const settings = getSettings();
  const entry: MemoryEntry = {
    id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    sourceType: type,
    rawText: text,
    fileName,
    createdAt: new Date().toISOString(),
    tags
  };

  // 1. Always save in the local database for offline UI rendering of the history timeline
  addSimMemory(space.containerTag, entry);

  // 2. If in Live mode, also push to Supermemory Local service
  if (settings.mode === 'live') {
    try {
      /*
       * CRITICAL SECURITY COMMENT FOR AUDITORS:
       * Restricting the file processing scope strictly to text/markdown here.
       * We avoid using Supermemory's native file upload API to prevent calling any cloud OCR parser.
       * We ingest the text directly to the document endpoint.
       */
      const url = `${settings.supermemoryUrl}/v3/documents`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (settings.supermemoryApiKey) {
        headers['x-supermemory-api-key'] = settings.supermemoryApiKey;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: text,
          containerTag: space.containerTag,
          metadata: {
            sourceType: type,
            fileName: fileName || '',
            tags: tags.join(',')
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Supermemory Local Error: ${response.status} - ${errText}`);
      }
    } catch (err: any) {
      console.error('Failed to index memory in Live Supermemory Local:', err);
      // We don't fail the operation completely, since it's saved locally, but we notify the user.
      throw new Error(`Memory saved locally, but Supermemory indexing failed: ${err.message}`);
    }
  }

  logAuditAction('memory_added', space.id, space.name, `Ingested ${type} memory (${text.length} chars)`);
  return entry;
}

// Get space history timeline
export function getSpaceTimeline(spaceId: string): MemoryEntry[] {
  const spaces = getClientSpaces();
  const space = spaces.find(s => s.id === spaceId);
  if (!space) return [];
  return getSimMemories(space.containerTag);
}

// Scoped Search/Chat query (Strictly isolated by containerTag)
export async function querySpace(
  spaceId: string,
  query: string
): Promise<{ answer: string; citations: MemoryEntry[] }> {
  const spaces = getClientSpaces();
  const space = spaces.find(s => s.id === spaceId);
  if (!space) {
    throw new Error(`Invalid Client Space Selection: Space ID ${spaceId} not found.`);
  }

  const settings = getSettings();
  logAuditAction('query_run', space.id, space.name, `Executed query: "${query.substring(0, 30)}..."`);

  // --- Simulation Mode ---
  if (settings.mode === 'mock') {
    return generateSimulatedAnswer(space.containerTag, space.name, query, settings);
  }

  // --- Live Supermemory Mode ---
  try {
    const searchUrl = `${settings.supermemoryUrl}/v4/search`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (settings.supermemoryApiKey) {
      headers['x-supermemory-api-key'] = settings.supermemoryApiKey;
    }

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        q: query,
        containerTag: space.containerTag,
        searchMode: 'hybrid',
        limit: 4
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supermemory search failed: ${response.status} - ${errText}`);
    }

    const searchData: any = await response.json();
    
    // Convert Supermemory search results to local MemoryEntry schema for citations
    const citations: MemoryEntry[] = (searchData.results || []).map((res: any, idx: number) => {
      // Supermemory returns either res.memory or res.chunk
      const content = res.memory || res.chunk || '';
      const meta = res.metadata || {};
      
      return {
        id: res.id || `sm_res_${idx}`,
        sourceType: (meta.sourceType as MemorySourceType) || 'note',
        rawText: content,
        fileName: meta.fileName || undefined,
        createdAt: res.updatedAt || new Date().toISOString(),
        tags: meta.tags ? meta.tags.split(',') : []
      };
    });

    if (citations.length === 0) {
      return {
        answer: `I searched Supermemory Local for the space ${space.name} but found no relevant memories or documents for "${query}".`,
        citations: []
      };
    }

    // Call standard LLM with the context retrieved from Supermemory Local search
    const contextStr = citations
      .map((c, i) => `[Source ${i + 1} - ${c.sourceType}${c.fileName ? ` (${c.fileName})` : ''}]:\n${c.rawText}`)
      .join('\n\n');

    const systemPrompt = `You are a secure, confidential AI Assistant for a professional.
You are currently operating STRICTLY within the client boundary of: "${space.name}" (tag: ${space.containerTag}).
You must answer the user's question using ONLY the provided client context retrieved from Supermemory Local.
If the answer cannot be found in the context, state that you do not know based on the current client database.
DO NOT mention or refer to any other clients, and DO NOT make assumptions outside the provided text.
Always refer to sources as [Source 1], [Source 2], etc. where appropriate.`;

    const userPrompt = `Context:\n${contextStr}\n\nQuestion: ${query}`;

    // Call the LLM (OpenAI, Gemini, Anthropic, or Ollama) using the scoped HTTP fetch
    const answer = await callLLM(settings, systemPrompt, userPrompt);
    return { answer: answer.replace(/\*/g, ''), citations };

  } catch (error: any) {
    console.error('Live Supermemory search/chat failed, falling back:', error);
    // If Live server is down, we fall back to our local mock simulation of search & generation
    const fallbackAnswer = await generateSimulatedAnswer(space.containerTag, space.name, query, settings);
    return {
      answer: `[Supermemory Connection Failed - Fallback Answer]\n\n${fallbackAnswer.answer.replace(/\*/g, '')}`,
      citations: fallbackAnswer.citations
    };
  }
}
