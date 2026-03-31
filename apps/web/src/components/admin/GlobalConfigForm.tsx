import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

interface ConfigState {
  startingPurse: number;
  maxSquadSize: number;
  minBasePrice: number;
}

export function GlobalConfigForm() {
  const [config, setConfig] = useState<ConfigState>({ startingPurse: 100000, maxSquadSize: 7, minBasePrice: 3000 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    apiFetch<ConfigState>('/api/event-config').then((res) => {
      if (res.success && res.data) setConfig(res.data);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const res = await apiFetch<ConfigState>('/api/event-config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
    setSaving(false);
    if (res.success) {
      setMessage({ type: 'success', text: 'Configuration saved' });
    } else {
      setMessage({ type: 'error', text: res.error?.details?.join(', ') || res.error?.message || 'Save failed' });
    }
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.heading}>Global Configuration</h2>
      <div style={styles.row}>
        <label style={styles.label}>
          Starting Purse
          <input type="number" value={config.startingPurse} onChange={(e) => setConfig({ ...config, startingPurse: Number(e.target.value) })} style={styles.input} />
        </label>
        <label style={styles.label}>
          Max Squad Size
          <input type="number" value={config.maxSquadSize} onChange={(e) => setConfig({ ...config, maxSquadSize: Number(e.target.value) })} style={styles.input} />
        </label>
        <label style={styles.label}>
          Min Base Price
          <input type="number" value={config.minBasePrice} onChange={(e) => setConfig({ ...config, minBasePrice: Number(e.target.value) })} style={styles.input} />
        </label>
      </div>
      {message && <p style={{ color: message.type === 'error' ? '#f87171' : '#4ade80', margin: '0.5rem 0 0' }}>{message.text}</p>}
      <button onClick={handleSave} disabled={saving} style={styles.btn}>
        {saving ? 'Saving...' : 'Save Configuration'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { backgroundColor: '#1e293b', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' },
  heading: { fontSize: '1.25rem', margin: '0 0 1rem', color: '#e2e8f0' },
  row: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.25rem', color: '#94a3b8', fontSize: '0.875rem', flex: 1 },
  input: { padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#e2e8f0', fontSize: '1rem' },
  btn: { marginTop: '1rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#3b82f6', color: '#fff', fontSize: '0.875rem', cursor: 'pointer' },
};
