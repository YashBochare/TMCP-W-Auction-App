import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { UserRole } from '@auction/shared';

interface AuthState {
  token: string;
  role: UserRole;
  teamId?: string;
  teamName?: string;
}

interface AuthContextValue {
  user: AuthState | null;
  isAuthenticated: boolean;
  login: (accessCode: string, route: 'captain' | 'admin') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadSession(): AuthState | null {
  const stored = sessionStorage.getItem('auth');
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (!parsed.token || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState | null>(loadSession);

  const login = useCallback(async (accessCode: string, route: 'captain' | 'admin') => {
    const res = await fetch(`/api/auth/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode }),
    });

    if (!res.ok) {
      let message = 'Login failed';
      try {
        const data = await res.json();
        message = data.error || message;
      } catch { /* non-JSON error body */ }
      throw new Error(message);
    }

    const data = await res.json();
    const authState: AuthState = {
      token: data.token,
      role: data.role,
      teamId: data.teamId,
      teamName: data.teamName,
    };
    sessionStorage.setItem('auth', JSON.stringify(authState));
    setUser(authState);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('auth');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
