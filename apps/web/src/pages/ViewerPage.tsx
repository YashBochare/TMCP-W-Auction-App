export function ViewerPage() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Viewer Display</h1>
        <p style={styles.subtitle}>TMCP-W Auction App</p>
        <p style={styles.status}>Waiting for auction to begin...</p>
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
  status: { fontSize: '1rem', color: '#64748b', marginTop: '1rem' },
};
