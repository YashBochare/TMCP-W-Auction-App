import { useState } from 'react';
import { GlobalConfigForm } from '../../components/admin/GlobalConfigForm';
import { TeamConfigForm } from '../../components/admin/TeamConfigForm';
import { PlayerUpload } from '../../components/admin/PlayerUpload';
import { PlayerRosterTable } from '../../components/PlayerRosterTable';

export function EventSetup() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Event Setup</h1>
      <GlobalConfigForm />
      <TeamConfigForm />
      <PlayerUpload onUploadSuccess={() => setRefreshKey(k => k + 1)} />
      <PlayerRosterTable refreshKey={refreshKey} />
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
