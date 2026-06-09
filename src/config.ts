// ─── Gemini API Key ───────────────────────────────────────────────────────────
// Set in .env: VITE_GEMINI_API_KEY=your_key
export const GEMINI_API_KEY: string = import.meta.env.VITE_GEMINI_API_KEY ?? '';

// ─── Finnhub API Key ──────────────────────────────────────────────────────────
// Set in .env: VITE_FINNHUB_API_KEY=your_key
// Get a free key at: finnhub.io → "Get free API key"
export const FINNHUB_API_KEY: string = import.meta.env.VITE_FINNHUB_API_KEY ?? '';
