import { useEffect, useMemo, useState } from 'react';
import { fetchLocalGameState } from '../services/localGsi';
import { forgetAllPlayerSnapshots, listRememberedPlayers } from '../services/playerStorage';
import { dotaIdInputKind, normalizeDotaAccountId } from '../utils/dotaAccountId';

export default function PlayerConnection({ accountId, source, onConnect, onForget }) {
  const [value, setValue] = useState(accountId || '');
  const [status, setStatus] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [remembered, setRemembered] = useState(() => listRememberedPlayers());

  useEffect(() => { setValue(accountId || ''); }, [accountId]);
  useEffect(() => { setRemembered(listRememberedPlayers()); }, [accountId]);

  const otherRemembered = useMemo(
    () => remembered.filter(row => String(row.accountId) !== String(accountId || '')).slice(0, 5),
    [remembered, accountId],
  );

  async function detect(silent = false) {
    if (!silent) setStatus('Checking the local DotaSage bridge…');
    setDetecting(true);
    const state = await fetchLocalGameState();
    const detected = normalizeDotaAccountId(state?.player?.account_id);
    setDetecting(false);
    if (detected && onConnect?.(detected, 'live')) {
      setValue(detected);
      setStatus('Detected from your local Dota session.');
      return;
    }
    if (!silent) {
      setStatus(state?.bridge
        ? 'Bridge found, but no usable player ID is in the current Dota payload yet. Enter Demo Hero or a match, then retry.'
        : 'Local bridge not found. Start it first, or paste your Dota ID / SteamID64 below.');
    }
  }

  useEffect(() => {
    if (accountId) return;
    try {
      if (sessionStorage.getItem('dotasage:live-sync-enabled') === '1') detect(true);
    } catch {}
  }, []);

  function submit(event) {
    event.preventDefault();
    const normalized = normalizeDotaAccountId(value);
    if (!normalized || !onConnect?.(normalized, 'manual')) {
      setStatus('Enter a Dota account/friend ID or a 17-digit SteamID64.');
      return;
    }
    const kind = dotaIdInputKind(value);
    setValue(normalized);
    setStatus(kind === 'steamid64'
      ? `SteamID64 converted to Dota account ID ${normalized}. Connecting…`
      : 'Player connected on this device.');
  }

  function clearRemembered() {
    forgetAllPlayerSnapshots();
    setRemembered([]);
    setStatus('Remembered player summaries cleared from this browser. The active Dota ID stays connected until you press Forget.');
  }

  return <section id="player-connection" className="player-connect glass-panel">
    <div className="player-topline"><span>PLAYER CONNECTION</span><i /></div>
    {accountId ? <div className="player-connect-active">
      <div><small>CONNECTED DOTA ID</small><strong>{accountId}</strong><span>{source === 'live' ? 'detected from local Live Sync' : source === 'manual' ? 'entered manually' : 'saved on this device'}</span></div>
      <button className="ghost-button" onClick={onForget}>FORGET</button>
    </div> : <>
      <p>No DotaSage account required. Paste either your Dota account/friend ID or your 17-digit SteamID64.</p>
      <form className="player-connect-form" onSubmit={submit}>
        <input inputMode="numeric" pattern="[0-9]*" value={value} onChange={event => setValue(event.target.value.replace(/\D/g, ''))} placeholder="Dota ID or SteamID64" aria-label="Dota account ID or SteamID64" />
        <button className="primary-button" type="submit">CONNECT</button>
      </form>
      <button className="player-detect-button" onClick={() => detect(false)} disabled={detecting}>{detecting ? 'CHECKING LIVE SYNC…' : 'DETECT FROM LIVE SYNC'}</button>
      <small className="player-connect-help">{status || 'No OpenDota login is required. Match history can only be returned when Dota exposes it publicly.'}</small>
    </>}
    {otherRemembered.length > 0 && <div className="remembered-players">
      <div className="remembered-head"><small>REMEMBERED ON THIS DEVICE</small><button onClick={clearRemembered}>CLEAR REMEMBERED</button></div>
      <div className="remembered-list">{otherRemembered.map(row => <button key={row.accountId} onClick={() => onConnect?.(row.accountId, 'saved')} title={`Switch to ${row.name || row.accountId}`}>
        {row.avatar ? <img src={row.avatar} alt="" /> : <span className="remembered-avatar">P</span>}
        <span><b>{row.name || `Dota ${row.accountId}`}</b><small>ID {row.accountId}</small></span>
      </button>)}</div>
    </div>}
    {accountId && status && <small className="player-connect-help">{status}</small>}
  </section>;
}