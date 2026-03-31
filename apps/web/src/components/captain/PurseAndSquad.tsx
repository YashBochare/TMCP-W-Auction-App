import './captain.css';

interface Props {
  purse: number;
  squadSize: number;
}

export function PurseAndSquad({ purse, squadSize }: Props) {
  const purseClass = purse < 10000 ? 'purse--critical' : purse < 20000 ? 'purse--low' : '';

  return (
    <div className="purse-squad">
      <div className={`purse-squad__purse ${purseClass}`}>
        <span className="purse-squad__label">Purse</span>
        <span className="price">&#8377;{purse.toLocaleString()}</span>
      </div>
      <div className="purse-squad__squad">
        <span className="purse-squad__label">Squad</span>
        <span className="mono">{squadSize}/7</span>
        {squadSize >= 7 && <span className="purse-squad__full">FULL</span>}
      </div>
    </div>
  );
}
