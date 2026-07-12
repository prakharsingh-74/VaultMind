import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

// Dynamic fetch wrapper: uses Tauri's HTTP plugin for CORS-free backend calls inside Tauri,
// and falls back to standard fetch in browsers.
export const safeFetch = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__
  ? tauriFetch
  : window.fetch.bind(window);
