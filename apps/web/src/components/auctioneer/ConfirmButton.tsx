import { useState, useEffect } from 'react';

interface ConfirmButtonProps {
  className?: string;
  onConfirm: () => void;
  label: string;
  confirmLabel: string;
  disabled?: boolean;
}

export function ConfirmButton({ className = '', onConfirm, label, confirmLabel, disabled }: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(timer);
  }, [confirming]);

  if (confirming) {
    return (
      <button
        className={`${className} confirming`}
        onClick={() => { onConfirm(); setConfirming(false); }}
        disabled={disabled}
      >
        {confirmLabel}
      </button>
    );
  }

  return (
    <button className={className} onClick={() => setConfirming(true)} disabled={disabled}>
      {label}
    </button>
  );
}
