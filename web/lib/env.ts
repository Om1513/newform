export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 
  (typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:4000');
