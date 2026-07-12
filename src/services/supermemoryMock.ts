import { MemoryEntry, AppSettings } from '../types';
import { safeFetch as fetch } from './safeFetch';

// Local storage keys for simulation
const MOCK_DB_PREFIX = 'vaultmind_sim_db_';

export function getSimMemories(containerTag: string): MemoryEntry[] {
  const data = localStorage.getItem(`${MOCK_DB_PREFIX}${containerTag}`);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveSimMemories(containerTag: string, memories: MemoryEntry[]): void {
  localStorage.setItem(`${MOCK_DB_PREFIX}${containerTag}`, JSON.stringify(memories));
}

export function addSimMemory(containerTag: string, entry: MemoryEntry): void {
  const memories = getSimMemories(containerTag);
  memories.unshift(entry); // Newest first
  saveSimMemories(containerTag, memories);
}

// Simple token-overlap similarity scoring for mock semantic search
export function searchSimMemories(containerTag: string, query: string): { entry: MemoryEntry; score: number }[] {
  const memories = getSimMemories(containerTag);
  if (!query.trim()) {
    return memories.map(entry => ({ entry, score: 1.0 }));
  }

  const cleanTokens = (text: string) => 
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2); // Ignore very short words like 'is', 'to', 'a'

  const queryTokens = cleanTokens(query);
  if (queryTokens.length === 0) {
    return memories.map(entry => ({ entry, score: 0.1 }));
  }

  const results = memories.map(entry => {
    const contentTokens = new Set(cleanTokens(entry.rawText));
    let matchCount = 0;
    
    for (const token of queryTokens) {
      if (contentTokens.has(token)) {
        matchCount++;
      }
    }
    
    // Simple Jaccard similarity approximation
    const score = matchCount / (queryTokens.length + contentTokens.size - matchCount || 1);
    
    // Also check for exact substring matches as a boost
    const substringMatches = entry.rawText.toLowerCase().includes(query.toLowerCase());
    const finalScore = score + (substringMatches ? 0.3 : 0);

    return {
      entry,
      score: Math.min(finalScore, 1.0)
    };
  });

  // Filter out zero matches and sort by score descending
  return results
    .filter(r => r.score > 0.05)
    .sort((a, b) => b.score - a.score);
}

// Call standard LLM APIs using Tauri's native http fetch (bypasses CORS)
export async function callLLM(settings: AppSettings, systemPrompt: string, userPrompt: string): Promise<string> {
  const provider = settings.llmProvider;
  
  if (provider === 'openai') {
    if (!settings.llmApiKey) throw new Error('OpenAI API Key is missing in Settings.');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.llmApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI Error: ${response.status} - ${errText}`);
    }
    const json: any = await response.json();
    return json?.choices?.[0]?.message?.content || '';
  }
  
  if (provider === 'gemini') {
    if (!settings.llmApiKey) throw new Error('Gemini API Key is missing in Settings.');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${settings.llmApiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nUser Question:\n${userPrompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.3
        }
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini Error: ${response.status} - ${errText}`);
    }
    const json: any = await response.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  
  if (provider === 'anthropic') {
    if (!settings.llmApiKey) throw new Error('Anthropic API Key is missing in Settings.');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.llmApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.3
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic Error: ${response.status} - ${errText}`);
    }
    const json: any = await response.json();
    return json.content?.[0]?.text || '';
  }
  
  if (provider === 'ollama') {
    const url = `${settings.ollamaUrl || 'http://localhost:11434'}/api/chat`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.ollamaModel || 'llama3',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        options: {
          temperature: 0.3
        }
      })
    });
    if (!response.ok) {
      throw new Error(`Ollama local instance not responding. Make sure Ollama is running on ${settings.ollamaUrl}.`);
    }
    const json: any = await response.json();
    return json?.message?.content || '';
  }

  throw new Error('Unsupported LLM provider.');
}

// Generate answer based on context
export async function generateSimulatedAnswer(
  containerTag: string,
  spaceName: string,
  query: string,
  settings: AppSettings
): Promise<{ answer: string; citations: MemoryEntry[] }> {
  // 1. Perform local retrieval
  const searchResults = searchSimMemories(containerTag, query);
  
  // Take top 3 relevant memories
  const topResults = searchResults.slice(0, 3);
  const citations = topResults.map(r => r.entry);
  
  if (citations.length === 0) {
    return {
      answer: `I could not find any memories or files in the **${spaceName}** space related to your query. Try adding some client notes or documents first.`,
      citations: []
    };
  }

  // Construct system prompt for local containment
  const contextStr = citations
    .map((c, i) => `[Source ${i + 1} - ${c.sourceType}${c.fileName ? ` (${c.fileName})` : ''} - Added ${new Date(c.createdAt).toLocaleDateString()}]:\n${c.rawText}`)
    .join('\n\n');

  const systemPrompt = `You are a secure, confidential AI Assistant for a professional.
You are currently operating STRICTLY within the client boundary of: "${spaceName}" (tag: ${containerTag}).
You must answer the user's question using ONLY the provided client context.
If the answer cannot be found in the context, state that you do not know based on the current client database.
DO NOT mention or refer to any other clients, and DO NOT make assumptions outside the provided text.
Always refer to sources as [Source 1], [Source 2], etc. where appropriate.`;

  const userPrompt = `Context:\n${contextStr}\n\nQuestion: ${query}`;

  try {
    const answer = await callLLM(settings, systemPrompt, userPrompt);
    return { answer, citations };
  } catch (error: any) {
    // Elegant fallback if Ollama/API key fails
    console.warn('LLM call failed, falling back to local text synthesis:', error);
    
    // Construct a beautiful mock synthesis response
    const mockAnswer = `[Simulated Local Engine] (Note: API call to ${settings.llmProvider} failed: ${error.message})\n\nHere is a local synthesis of your memories in **${spaceName}**:\n\n` +
      citations.map((c, idx) => {
        const sentences = c.rawText.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const snippet = sentences[0] ? sentences[0].trim() + '.' : c.rawText.slice(0, 100) + '...';
        return `• From your ${c.sourceType}${c.fileName ? ` "${c.fileName}"` : ''} [Source ${idx + 1}]: "${snippet}"`;
      }).join('\n\n') + 
      `\n\nTo enable fully conversational AI answers, ensure your configured LLM (currently ${settings.llmProvider.toUpperCase()}) is active and your API key or connection is valid.`;

    return {
      answer: mockAnswer,
      citations
    };
  }
}
