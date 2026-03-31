import { GlobalConfigForm } from '../../components/admin/GlobalConfigForm';
import { TeamConfigForm } from '../../components/admin/TeamConfigForm';
import { PlayerRosterTable } from '../../components/PlayerRosterTable';

export function EventSetup() {

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Event Setup</h1>
      <GlobalConfigForm />
      <TeamConfigForm />
      <PlayerRosterTable />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '2rem 1rem',
    color: '#e2e8f0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  title: { fontSize: '1.75rem', marginBottom: '1.5rem' },
};
