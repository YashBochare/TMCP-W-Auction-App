import { useState, useEffect } from 'react';
import { ALLOWED_COLORS } from '@auction/shared';
import { apiFetch } from '../../lib/api';

interface TeamRow {
  id?: string;
  name: string;
  accessCode: string;
  colorCode: string;
}

const COLOR_HEX: Record<string, string> = {
  slate: '#64748b', gold: '#d4a017', navy: '#1e3a5f', emerald: '#047857',
  crimson: '#b91c1c', violet: '#7c3aed', amber: '#d97706', teal: '#0d9488',
};

function randomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function defaultTeams(count: number): TeamRow[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `Team ${i + 1}`,
    accessCode: randomCode(),
    colorCode: ALLOWED_COLORS[i % ALLOWED_COLORS.length],
  }));
}

export function TeamConfigForm() {
  const [teams, setTeams] = useState<TeamRow[]>(defaultTeams(4));
  const [teamCount, setTeamCount] = useState(4);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    apiFetch<TeamRow[]>('/api/teams').then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setTeams(res.data);
        setTeamCount(res.data.length);
      }
    });
  }, []);

  const handleCountChange = (count: number) => {
    setTeamCount(count);
    if (count > teams.length) {
      setTeams([...teams, ...defaultTeams(count - teams.length)]);
    } else {
      setTeams(teams.slice(0, count));
    }
  };

  const updateTeam = (index: number, field: keyof TeamRow, value: string) => {
    const updated = [...teams];
    updated[index] = { ...updated[index], [field]: value };
    setTeams(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const res = await apiFetch<TeamRow[]>('/api/teams/batch', {
      method: 'POST',
      body: JSON.stringify({ teams }),
    });
    setSaving(false);
    if (res.success) {
      if (res.data) setTeams(res.data);
      setMessage({ type: 'success', text: 'Teams saved' });
    } else {
      setMessage({ type: 'error', text: res.error?.details?.join(', ') || res.error?.message || 'Save failed' });
    }
  };

  const removeTeam = (index: number) => {
    const updated = teams.filter((_, i) => i !== index);
    setTeams(updated);
    setTeamCount(updated.length);
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.heading}>Team Configuration</h2>
      <label style={styles.countLabel}>
        Number of Teams
        <select value={teamCount} onChange={(e) => handleCountChange(Number(e.target.value))} style={styles.select}>
          {Array.from({ length: 7 }, (_, i) => i + 2).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>

      <div style={styles.teamList}>
        {teams.map((team, i) => (
          <div key={i} style={styles.teamRow}>
            <input value={team.name} onChange={(e) => updateTeam(i, 'name', e.target.value)} placeholder="Team name" style={{ ...styles.input, flex: 2 }} />
            <input value={team.accessCode} onChange={(e) => updateTeam(i, 'accessCode', e.target.value)} placeholder="Access code" style={{ ...styles.input, flex: 1.5 }} />
            <select value={team.colorCode} onChange={(e) => updateTeam(i, 'colorCode', e.target.value)} style={{ ...styles.select, flex: 1 }}>
              {ALLOWED_COLORS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <span style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: COLOR_HEX[team.colorCode] || '#666', flexShrink: 0 }} />
            <button onClick={() => removeTeam(i)} style={styles.deleteBtn} title="Remove team">x</button>
          </div>
        ))}
      </div>

      {message && <p style={{ color: message.type === 'error' ? '#f87171' : '#4ade80', margin: '0.5rem 0 0' }}>{message.text}</p>}
      <button onClick={handleSave} disabled={saving} style={styles.btn}>
        {saving ? 'Saving...' : 'Save All Teams'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { backgroundColor: '#1e293b', borderRadius: '0.75rem', padding: '1.5rem' },
  heading: { fontSize: '1.25rem', margin: '0 0 1rem', color: '#e2e8f0' },
  countLabel: { display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' },
  select: { padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#e2e8f0', fontSize: '0.875rem' },
  teamList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  teamRow: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  input: { padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#e2e8f0', fontSize: '0.875rem' },
  deleteBtn: { padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #334155', backgroundColor: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem' },
  btn: { marginTop: '1rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#3b82f6', color: '#fff', fontSize: '0.875rem', cursor: 'pointer' },
};
