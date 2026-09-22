import { useEffect, useMemo, useState } from 'react';
import { fetchLocalGameState } from '../services/localGsi';
import { searchPlayers } from '../services/playerSearch';
import { forgetAllPlayerSnapshots, listRememberedPlayers } from '../services/playerStorage';
import { dotaIdInputKind, normalizeDotaAccountId } from '../utils/dotaAccountId';

function lastSeenLabel(value) {
  if (!value) return 'activity unknown';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'activity unknown';
  const days = Math.max(0, Math.floor((Date.now() - time) / 86400000));
  if (days === 0) return 'played recently';
  if (days === 1) return 'last match yesterday';
  if (days < 30) return `last match ${days}d ago`;
  return `last match ${Math.floor(days / 30)}mo ago`;
}

export default function PlayerConnection({ accountId, source, onConnect, onForget }) {
  const [value, setValue] = useState(accountId || '');
  const [status, setStatus] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [remembered, setRemembered] = useState(() => listRememberedPlayers());

  useEffect(() => { setValue(accountId || ''); setResults([]); }, [accountId]);
  useEffect(() => { setRemembered(listRememberedPlayers()); }, [accountId]);

  const otherRemembered = useMemo(
    () => remembered.filter(row => String(row.accountId) !== String(accountId || '')).slice(0, 5),
    [remembered, accountId],
  );

  async function detect(silent = false) {
    if (!silent) setStatus('Checking optional desktop Live Sync…');
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
        ? 'Desktop bridge is online, but it has not exposed a player ID yet.'
        : 'No desktop bridge detected. That is fine — ID and username search work entirely online.');
    }
  }

  useEffect(() => {
    if (accountId) return;
    try {
      if (sessionStorage.getItem('dotasage:live-sync-enabled') === '1') detect(true);
    } catch {}
  }, []);

  async function runSearch(query) {
    const q = String(query || '').trim();
    if (q.length < 2) {
      setStatus('Type at least two characters to search player names.');
      setResults([]);
      return;
    }
    setSearching(true);
    setStatus('Searching public Dota player records…');
    try {
      const rows = await searchPlayers(q);
      setResults(rows);
      setStatus(rows.length
        ? `Found ${rows.length} public player${rows.length === 1 ? '' : 's'}. Pick the right profile.`
        : 'No public player names matched that search. Try the exact Steam/Dota name or use the numeric ID.');
    } catch {
      setResults([]);
      setStatus('Player-name search is temporarily unavailable. Numeric Dota IDs still work.');
    } finally {
      setSearching(false);
    }
  }

  function connectId(raw, nextSource = 'manual') {
    const normalized = normalizeDotaAccountId(raw);
    if (!normalized || !onConnect?.(normalized, nextSource)) return false;
    setValue(normalized);
    setResults([]);
    const kind = dotaIdInputKind(raw);
    setStatus(kind === 'steamid64'
      ? `SteamID64 converted to Dota account ID ${normalized}. Connecting…`
      : 'Player connected on this device.');
    return true;
  }

  function submit(event) {
    event.preventDefault();
    const q = String(value || '').trim();
    if (/^\d+$/.test(q)) {
      if (!connectId(q, 'manual')) setStatus('Enter a valid Dota account/friend ID or 17-digit SteamID64.');
      return;
    }
    runSearch(q);
  }

  function chooseResult(row) {
    if (!row?.accountId) return;
    connectId(String(row.accountId), 'search');
  }

  function clearRemembered() {
    forgetAllPlayerSnapshots();
    setRemembered([]);
    setStatus('Remembered player summaries cleared from this browser. The active Dota ID stays connected until you press Forget.');
  }

  return <section id="player-connection" className="player-connect glass-panel">
    <div className="player-topline"><span>PLAYER CONNECTION</span><i /></div>
    {accountId ? <div className="player-connect-active">
      <div><small>CONNECTED DOTA ID</small><strong>{accountId}</strong><span>{source === 'live' ? 'detected from optional Live Sync' : source === 'search' ? 'found by player-name search' : source === 'manual' ? 'entered manually' : 'saved on this device'}</span></div>
      <button className="ghost-button" onClick={onForget}>FORGET</button>
    </div> : <>
      <p>Search a public player name, or paste a Dota account ID / SteamID64. No DotaSage account is required.</p>
      <form className="player-connect-form player-search-form" onSubmit={submit}>
        <div className="player-search-input">
          <span aria-hidden="true">⌕</span>
          <input value={value} onChange={event => { setValue(event.target.value); setResults([]); }} placeholder="Player name, @vanity, Steam link, Dota ID…" aria-label="Player name, Steam profile or vanity, Dota account ID, or SteamID64" autoComplete="off" />
        </div>
        <button className="primary-button" type="submit" disabled={searching}>{searching ? 'SEARCHING…' : /^\d+$/.test(String(value).trim()) ? 'CONNECT' : 'SEARCH'}</button>
      </form>
      {results.length > 0 && <div className="player-search-results" role="listbox" aria-label="Player search results">
        {results.map(row => <button key={row.accountId} onClick={() => chooseResult(row)} role="option">
          {row.avatar ? <img src={row.avatar} alt="" /> : <span className="search-avatar">P</span>}
          <span className="search-result-copy"><b>{row.name}</b><small>ID {row.accountId} · {lastSeenLabel(row.lastMatchTime)}</small></span>
          <em>CONNECT →</em>
        </button>)}
      </div>}
      <div className="player-connect-secondary">
        <button className="player-detect-button" onClick={() => detect(false)} disabled={detecting}>{detecting ? 'CHECKING…' : 'OPTIONAL DESKTOP DETECT'}</button>
        <small>Names are not unique. Paste a Steam profile URL or use @custom-vanity for an exact Steam lookup.</small>
      </div>
      <small className="player-connect-help">{status || 'Public match history still depends on the player’s Dota privacy setting.'}</small>
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
