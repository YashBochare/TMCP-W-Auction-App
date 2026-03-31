import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  route: 'captain' | 'admin';
  redirectTo: string;
}

export function LoginPage({ route, redirectTo }: LoginPageProps) {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(accessCode, route);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const title = route === 'admin' ? 'Auctioneer Login' : 'Captain Login';

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.subtitle}>TMCP-W Auction App</p>
        {error && <p style={styles.error}>{error}</p>}
        <input
          type="password"
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="Enter access code"
          style={styles.input}
          autoFocus
          required
        />
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Verifying...' : 'Enter'}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '2rem',
    width: '100%',
    maxWidth: '360px',
  },
  title: { fontSize: '1.5rem', margin: 0, textAlign: 'center' as const },
  subtitle: { fontSize: '0.875rem', color: '#94a3b8', margin: 0, textAlign: 'center' as const },
  error: { color: '#f87171', fontSize: '0.875rem', margin: 0, textAlign: 'center' as const },
  input: {
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    fontSize: '1rem',
    outline: 'none',
  },
  button: {
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#fff',
    fontSize: '1rem',
    cursor: 'pointer',
  },
};
