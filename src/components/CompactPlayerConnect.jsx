import { useEffect, useState } from 'react';
import { normalizeDotaAccountId } from '../utils/dotaAccountId';

export default function CompactPlayerConnect({ accountId }) {
  const [editing, setEditing] = useState(!accountId);
  const [value, setValue] = useState(accountId || '');
  const [error, setError] = useState('');

  useEffect(() => {
    setValue(accountId || '');
    setEditing(!accountId);
    setError('');
  }, [accountId]);

  function save(event) {
    event?.preventDefault?.();
    const normalized = normalizeDotaAccountId(value);
    if (!normalized) {
      setError('Enter a valid Dota ID or SteamID64.');
      return;
    }
    try {
      localStorage.setItem('dotasage:player-account-id', normalized);
      localStorage.setItem('dotasage:player-source', 'manual');
      window.location.reload();
    } catch {
      setError('Could not save the player on this browser.');
    }
  }

  if (!editing && accountId) {
    return <section className="compact-player-connect connected">
      <div>
        <span>PLAYER</span>
        <strong>{accountId}</strong>
      </div>
      <button onClick={() => setEditing(true)}>CHANGE</button>
    </section>;
  }

  return <section className="compact-player-connect">
    <form onSubmit={save}>
      <label htmlFor="compact-player-id">PLAYER ID</label>
      <input
        id="compact-player-id"
        value={value}
        onChange={event => { setValue(event.target.value); setError(''); }}
        placeholder="Dota ID or SteamID64"
        inputMode="numeric"
        autoComplete="off"
      />
      <button type="submit">CONNECT</button>
      {accountId && <button type="button" className="ghost" onClick={() => { setValue(accountId); setEditing(false); setError(''); }}>CANCEL</button>}
    </form>
    {error && <small>{error}</small>}
  </section>;
}
