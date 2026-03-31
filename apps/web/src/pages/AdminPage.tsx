import { useAuth } from '../context/AuthContext';

export function AdminPage() {
  const { logout } = useAuth();

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Auctioneer Dashboard</h1>
        <p style={styles.subtitle}>Admin Control Panel</p>
        <button onClick={logout} style={styles.logoutBtn}>Logout</button>
      </div>
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
  content: { textAlign: 'center' as const },
  title: { fontSize: '2rem', marginBottom: '0.5rem' },
  subtitle: { fontSize: '1.25rem', color: '#94a3b8' },
  logoutBtn: {
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid #334155',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
  },
};
