import { useState, useRef } from 'react';

interface UploadResult {
  success: boolean;
  playersCreated?: number;
  errors?: { row: number; field: string; message: string }[];
}

export function PlayerUpload({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/players/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setResult({ success: true, playersCreated: data.playersCreated });
        if (fileRef.current) fileRef.current.value = '';
        onUploadSuccess?.();
      } else {
        setResult({
          success: false,
          playersCreated: data.playersCreated ?? 0,
          errors: data.errors ?? [{ row: 0, field: 'file', message: data.error || 'Upload failed' }],
        });
      }
    } catch {
      setResult({ success: false, errors: [{ row: 0, field: 'file', message: 'Network error' }] });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={s.card}>
      <h2 style={s.heading}>Upload Players</h2>
      <p style={s.muted}>Upload an Excel (.xlsx) file with columns: Name, Role, Club Level, Speaking Skill, Fun Title, Base Price</p>

      <div style={s.row}>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          style={s.fileInput}
        />
        <button onClick={handleUpload} disabled={uploading} style={s.btn}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {result && result.success && (
        <p style={s.success}>{result.playersCreated} players uploaded successfully.</p>
      )}

      {result && !result.success && result.errors && (
        <div style={s.errorBox}>
          {result.playersCreated != null && result.playersCreated > 0 && (
            <p style={s.warn}>{result.playersCreated} players uploaded, but some rows had errors:</p>
          )}
          {result.errors.map((e, i) => (
            <p key={i} style={s.errorLine}>
              {e.row > 0 ? `Row ${e.row}` : ''} {e.field}: {e.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: { backgroundColor: '#1e293b', borderRadius: '0.75rem', padding: '1.5rem', marginTop: '1.5rem' },
  heading: { fontSize: '1.25rem', margin: '0 0 0.5rem', color: '#e2e8f0' },
  muted: { color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' },
  row: { display: 'flex', gap: '0.75rem', alignItems: 'center' },
  fileInput: { color: '#e2e8f0', fontSize: '0.85rem' },
  btn: { padding: '0.5rem 1.25rem', borderRadius: '0.375rem', border: 'none', backgroundColor: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
  success: { color: '#4ade80', marginTop: '0.75rem', fontSize: '0.85rem' },
  warn: { color: '#fbbf24', fontSize: '0.85rem', marginBottom: '0.25rem' },
  errorBox: { backgroundColor: '#0f172a', borderRadius: '0.5rem', padding: '0.75rem', marginTop: '0.75rem', border: '1px solid #7f1d1d' },
  errorLine: { color: '#f87171', fontSize: '0.8rem', margin: '0.15rem 0' },
};
