import { useEffect, useRef, useState } from 'react';
import { createSocket, connectAndRegister } from '../socket';
import type { TypedSocket } from '../socket';

export function ConnectionStatus() {
  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const socketRef = useRef<TypedSocket | null>(null);

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    connectAndRegister(socket, 'viewer');

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  const handlePing = () => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    const clientTime = Date.now();
    // Remove any stale pong listener before adding new one
    socket.off('server:pong');
    socket.once('server:pong', (data) => {
      setLatency(Date.now() - data.clientTime);
    });
    socket.emit('client:ping', { clientTime });
  };

  return (
    <div style={styles.bar}>
      <span style={{ color: connected ? '#4ade80' : '#f87171' }}>
        {connected ? 'Connected' : 'Disconnected'}
      </span>
      <button onClick={handlePing} style={styles.btn} disabled={!connected}>
        Ping
      </button>
      {latency !== null && <span style={styles.latency}>{latency}ms</span>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '0.5rem 1rem',
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    zIndex: 1000,
  },
  btn: {
    padding: '0.25rem 0.75rem',
    borderRadius: '0.25rem',
    border: '1px solid #334155',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  latency: { color: '#94a3b8' },
};
