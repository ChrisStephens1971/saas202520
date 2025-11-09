/**
 * SWR Fetcher Utility
 * Common fetcher function for all analytics API calls
 */

// Extended Error type for fetch errors
interface FetchError extends Error {
  info?: unknown;
  status?: number;
}

export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.') as FetchError;
    // Attach extra info to the error object
    error.info = await res.json();
    error.status = res.status;
    throw error;
  }

  return res.json();
}

export function buildQueryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}
