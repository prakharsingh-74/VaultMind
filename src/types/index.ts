export interface ClientSpace {
  id: string;
  name: string;
  color: string; // hex or theme color name
  createdAt: string;
  containerTag: string; // e.g. client_acme_corp
  retentionDays?: number; // optional auto-purge setting
}

export type MemorySourceType = 'note' | 'pasted_email' | 'meeting_summary' | 'file';

export interface MemoryEntry {
  id: string;
  sourceType: MemorySourceType;
  rawText: string;
  fileName?: string;
  createdAt: string;
  tags: string[];
}

export type AuditActionType = 'space_created' | 'memory_added' | 'query_run' | 'space_switched' | 'app_locked' | 'app_unlocked';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditActionType;
  spaceId?: string;
  spaceName?: string;
  details?: string; // Metadata description only (e.g. "Note added", "CSV Exported"), NO sensitive client content.
}

export type LLMProvider = 'ollama' | 'openai' | 'gemini' | 'anthropic';
export type AppMode = 'mock' | 'live';

export interface AppSettings {
  mode: AppMode;
  supermemoryUrl: string;
  supermemoryApiKey: string;
  llmProvider: LLMProvider;
  llmApiKey: string;
  ollamaUrl: string;
  ollamaModel: string;
  theme?: 'dark' | 'light';
  panicLockPinHash?: string;
  panicShortcut?: string;
  panicIdleTimeout?: number;
}
