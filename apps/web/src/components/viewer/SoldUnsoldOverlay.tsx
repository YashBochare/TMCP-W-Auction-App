import './viewer.css';

interface SoldProps {
  playerName: string;
  teamName: string;
  soldPrice: number;
}

interface UnsoldProps {
  playerName: string;
}

export function SoldOverlay({ playerName, teamName, soldPrice }: SoldProps) {
  return (
    <div className="overlay overlay--sold">
      <div className="overlay__content">
        <div className="overlay__title overlay__title--sold">SOLD!</div>
        <div className="overlay__player">{playerName}</div>
        <div className="overlay__price price">&#8377;{soldPrice.toLocaleString()}</div>
        <div className="overlay__team">to {teamName}</div>
      </div>
    </div>
  );
}

export function UnsoldOverlay({ playerName }: UnsoldProps) {
  return (
    <div className="overlay overlay--unsold">
      <div className="overlay__content">
        <div className="overlay__title overlay__title--unsold">UNSOLD</div>
        <div className="overlay__player">{playerName}</div>
      </div>
    </div>
  );
}
