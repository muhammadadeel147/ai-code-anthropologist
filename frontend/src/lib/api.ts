/**
 * API Configuration
 * Centralized API URL management
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';

/**
 * Build API endpoint URL
 */
export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

/**
 * Build WebSocket URL
 */
export function wsUrl(path: string): string {
  return `${WS_URL}${path}`;
}

// Made with Bob
