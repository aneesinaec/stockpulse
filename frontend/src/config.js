// API Configuration
// Uses environment variable in production, falls back to proxy in development
export const API_BASE = import.meta.env.VITE_API_URL || '';
