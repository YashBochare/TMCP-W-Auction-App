import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import type { Player } from '@auction/shared';

interface EditState {
  id: string;
  name: string;
  role: string;
  clubLevel: string;
  speakingSkill: string;
  funTitle: string;
  basePrice: number;
}

export function PlayerRosterTable({ refreshKey }: { refreshKey?: number }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch<Player[]>('/api/players');
    setLoading(false);
    if (res.success && res.data) {
      setPlayers(res.data);
    } else {
      setError(res.error?.message || 'Failed to load players');
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers, refreshKey]);

  const startEdit = (p: Player) => {
    setEditing({
      id: p.id,
      name: p.name,
      role: p.role,
      clubLevel: p.clubLevel,
      speakingSkill: p.speakingSkill,
      funTitle: p.funTitle,
      basePrice: p.basePrice,
    });
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setEditError(null);
    const res = await apiFetch<Player>(`/api/players/${editing.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: editing.name,
        role: editing.role,
        clubLevel: editing.clubLevel,
        speakingSkill: editing.speakingSkill,
        funTitle: editing.funTitle,
        basePrice: editing.basePrice,
      }),
    });
    setSaving(false);
    if (res.success) {
      setEditing(null);
      fetchPlayers();
    } else {
      setEditError(res.error?.message || 'Save failed');
    }
  };

  const deletePlayer = async (id: string, name: string) => {
    if (!confirm(`Delete player "${name}"? This cannot be undone.`)) return;
    const res = await apiFetch(`/api/players/${id}`, { method: 'DELETE' });
    if (res.success !== false) {
      setPlayers((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const formatCurrency = (n: number) => n.toLocaleString();

  if (loading) {
    return <div style={s.card}><p style={s.muted}>Loading players...</p></div>;
  }

  if (error) {
    return (
      <div style={s.card}>
        <p style={{ color: '#f87171' }}>{error}</p>
        <button onClick={fetchPlayers} style={s.btn}>Retry</button>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div style={s.card}>
        <h2 style={s.heading}>Player Roster</h2>
        <p style={s.muted}>No players loaded. Upload an Excel file to get started.</p>
      </div>
    );
  }

  return (
    <div style={s.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={s.heading}>{players.length} players loaded</h2>
        <button onClick={fetchPlayers} style={s.btnSm}>Refresh</button>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div style={s.editBar}>
          <strong>Editing: {editing.name}</strong>
          <div style={s.editRow}>
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} style={s.input} placeholder="Name" />
            <input value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} style={s.input} placeholder="Role" />
            <input value={editing.clubLevel} onChange={(e) => setEditing({ ...editing, clubLevel: e.target.value })} style={s.input} placeholder="Club Level" />
            <input value={editing.speakingSkill} onChange={(e) => setEditing({ ...editing, speakingSkill: e.target.value })} style={s.input} placeholder="Speaking" />
            <input value={editing.funTitle} onChange={(e) => setEditing({ ...editing, funTitle: e.target.value })} style={s.input} placeholder="Fun Title" />
            <input type="number" value={editing.basePrice} onChange={(e) => setEditing({ ...editing, basePrice: Number(e.target.value) })} style={{ ...s.input, width: '100px' }} />
          </div>
          {editError && <p style={{ color: '#f87171', margin: '0.25rem 0 0', fontSize: '0.8rem' }}>{editError}</p>}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button onClick={saveEdit} disabled={saving} style={s.btn}>{saving ? 'Saving...' : 'Save'}</button>
            <button onClick={() => setEditing(null)} style={s.btnSm}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>#</th>
              <th style={s.th}>Name</th>
              <th style={s.th}>Role</th>
              <th style={s.th}>Club Level</th>
              <th style={s.th}>Speaking</th>
              <th style={s.th}>Fun Title</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Base Price</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={p.id} style={i % 2 === 0 ? s.rowEven : s.rowOdd}>
                <td style={s.td}>{i + 1}</td>
                <td style={s.td}>{p.name}</td>
                <td style={s.td}>{p.role}</td>
                <td style={s.td}>{p.clubLevel}</td>
                <td style={s.td}>{p.speakingSkill}</td>
                <td style={s.td}>{p.funTitle}</td>
                <td style={{ ...s.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(p.basePrice)}</td>
                <td style={s.td}>
                  <span style={{ color: p.status === 'SOLD' ? '#4ade80' : p.status === 'UNSOLD' ? '#f87171' : '#94a3b8' }}>{p.status}</span>
                </td>
                <td style={s.td}>
                  <button onClick={() => startEdit(p)} disabled={p.status === 'SOLD'} style={p.status === 'SOLD' ? s.btnDisabled : s.btnSm}>Edit</button>
                  <button onClick={() => deletePlayer(p.id, p.name)} disabled={p.status === 'SOLD'} style={p.status === 'SOLD' ? { ...s.btnDisabled, marginLeft: '0.25rem' } : { ...s.btnSm, marginLeft: '0.25rem', color: '#f87171' }}>Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: { backgroundColor: '#1e293b', borderRadius: '0.75rem', padding: '1.5rem', marginTop: '1.5rem' },
  heading: { fontSize: '1.25rem', margin: 0, color: '#e2e8f0' },
  muted: { color: '#64748b' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th: { textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #334155', color: '#94a3b8', fontWeight: 600 },
  td: { padding: '0.5rem', borderBottom: '1px solid #1e293b', color: '#e2e8f0' },
  rowEven: { backgroundColor: '#0f172a' },
  rowOdd: { backgroundColor: '#1e293b' },
  btn: { padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', backgroundColor: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' },
  btnSm: { padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #334155', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem' },
  btnDisabled: { padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #1e293b', backgroundColor: 'transparent', color: '#334155', cursor: 'not-allowed', fontSize: '0.75rem' },
  input: { padding: '0.375rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#e2e8f0', fontSize: '0.85rem' },
  editBar: { backgroundColor: '#0f172a', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem', border: '1px solid #334155' },
  editRow: { display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' },
};
