import { useAuth } from '../context/AuthContext';
import { useCaptainDashboard } from '../hooks/useCaptainDashboard';
import { CaptainDashboard } from '../components/captain/CaptainDashboard';
import '../components/captain/captain.css';

export function CaptainPage() {
  const { user } = useAuth();
  const state = useCaptainDashboard(user?.teamId, user?.token);

  return (
    <div className="captain-page">
      <CaptainDashboard
        teamName={state.teamName}
        teamColor={state.teamColor}
        purse={state.purse}
        squadSize={state.squadSize}
        maxSquadSize={state.maxSquadSize}
        myPlayers={state.myPlayers}
        connected={state.connected}
      />

      {state.isPaused && (
        <div className="captain-paused-banner">Auction Paused — Please wait</div>
      )}

      {state.soldOverlay && (
        <div className="captain-toast captain-toast--info">
          {state.soldOverlay.playerName} sold to {state.soldOverlay.teamName} for{' '}
          {state.soldOverlay.soldPrice.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
        </div>
      )}
    </div>
  );
}
