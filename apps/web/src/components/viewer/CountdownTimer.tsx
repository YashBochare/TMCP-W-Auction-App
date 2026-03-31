import './viewer.css';

interface Props {
  seconds: number;
  running: boolean;
  expired: boolean;
}

export function CountdownTimer({ seconds, running, expired }: Props) {
  if (!running && !expired) return null;

  const circumference = 2 * Math.PI * 45;
  const progress = Math.max(0, seconds) / 20;
  const dashOffset = circumference * (1 - progress);
  const color = seconds > 10 ? 'var(--timer-safe)' : seconds > 5 ? 'var(--timer-warning)' : 'var(--timer-danger)';
  const isDanger = seconds <= 5 && seconds > 0;

  if (expired) {
    return (
      <div className="timer timer--expired">
        <div className="timer__text timer__text--expired">TIME'S UP</div>
      </div>
    );
  }

  return (
    <div className="timer">
      <svg viewBox="0 0 100 100" className="timer__ring">
        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--bg-elevated)" strokeWidth="4" />
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className={`timer__text ${isDanger ? 'timer__text--danger' : ''}`} style={{ color }}>
        {seconds}
      </div>
    </div>
  );
}
