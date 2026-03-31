function getToken(): string | undefined {
  try {
    return JSON.parse(sessionStorage.getItem('auth') || '{}')?.token;
  } catch {
    return undefined;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: { message: string; details?: string[] } }> {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  try {
    return await res.json();
  } catch {
    return { success: false, error: { message: `Request failed with status ${res.status}` } };
  }
}
