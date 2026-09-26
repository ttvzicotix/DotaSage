import { useEffect, useMemo, useState } from 'react';
import { normalizeDotaAccountId } from '../utils/dotaAccountId';
import { loadPlayerSnapshot } from '../services/playerStorage';

const MEDALS = ['', 'Herald', 'Guardian', 'Crusader', 'Archon', 'Legend', 'Ancient', 'Divine', 'Immortal'];

function rankLabel(rankTier) {
  const rank = Number(rankTier || 0);
  if (!rank) return 'Uncalibrated';
  const medal = Math.floor(rank / 10);
  const star = rank % 10;
  if (medal >= 8) return 'Immortal';
  return `${MEDALS[medal] || 'Rank'}${star ? ` ${star}` : ''}`;
}

export default function CompactPlayerConnect({ accountId, player, loading = false, onOpenProfile }) {
  const [editing, setEditing] = useState(!accountId);
  const [value, setValue] = useState(accountId || '');
  const [error, setError] = useState('');

  useEffect(() => {
    setValue(accountId || '');
    setEditing(!accountId);
    setError('');
  }, [accountId]);

  const snapshot = useMemo(() => accountId ? loadPlayerSnapshot(accountId) : null, [accountId, player]);
  const avatar = player?.profile?.avatarfull || player?.profile?.avatarmedium || snapshot?.avatar || null;
  const name = player?.profile?.personaname || snapshot?.name || (accountId ? 'Dota player' : '');
  const rank = rankLabel(player?.rank_tier ?? snapshot?.rankTier);
  const provider = player?._provider || (snapshot ? 'saved' : null);

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
    return <section className="compact-player-connect identity-v28">
      <button className="identity-v28-main" onClick={onOpenProfile} title="Open player profile">
        <div className="identity-v28-avatar">
          {avatar ? <img src={avatar} alt="" /> : <span>{String(name || 'P').slice(0, 1).toUpperCase()}</span>}
        </div>
        <div className="identity-v28-copy">
          <strong>{loading && !snapshot && !player ? 'Loading player…' : name}</strong>
          <span>{rank}{provider ? ` · ${String(provider).toUpperCase()}` : ''}</span>
          <small>ID {accountId}</small>
        </div>
        <b>›</b>
      </button>
      <button className="identity-v28-change" onClick={() => setEditing(true)}>CHANGE</button>
    </section>;
  }

  return <section className="compact-player-connect connect-v28">
    <form onSubmit={save}>
      <label htmlFor="compact-player-id">PLAYER</label>
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
