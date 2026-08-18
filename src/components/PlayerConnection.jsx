import { useEffect, useState } from 'react';
import { fetchLocalGameState } from '../services/localGsi';
import './playerConnection.css';

export default function PlayerConnection({ accountId, source, onConnect, onForget }) {
  const [value, setValue] = useState(accountId || '');
  const [status, setStatus] = useState('');
  const [detecting, setDetecting] = useState(false);

  useEffect(() => { setValue(accountId || ''); }, [accountId]);

  async function detect(silent = false) {
    if (!silent) setStatus('Checking the local DotaSage bridge…');
    setDetecting(true);
    const state = await fetchLocalGameState();
    const detected = state?.player?.account_id;
    setDetecting(false);
    if (detected && onConnect?.(String(detected), 'live')) {
      setValue(String(detected));
      setStatus('Detected from your local Dota session.');
      return;
    }
    if (!silent) {
      setStatus(state?.bridge
        ? 'Bridge found, but no player ID is in the current Dota payload yet. Enter Demo Hero or a match, then retry.'
        : 'Local bridge not found. Start it first, or paste your Dota ID below.');
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
    if (!onConnect?.(value, 'manual')) {
      setStatus('Enter the numeric Dota account ID from your OpenDota or Dotabuff profile URL.');
      return;
    }
    setStatus('Player connected on this device.');
  }

  return <section id="player-connection" className="player-connect glass-panel">
    <div className="player-topline"><span>PLAYER CONNECTION</span><i /></div>
    {accountId ? <div className="player-connect-active">
      <div><small>CONNECTED DOTA ID</small><strong>{accountId}</strong><span>{source === 'live' ? 'detected from local Live Sync' : source === 'manual' ? 'entered manually' : 'saved on this device'}</span></div>
      <button className="ghost-button" onClick={onForget}>FORGET</button>
    </div> : <>
      <p>No DotaSage account required. Connect your public Dota profile once for personal history and FOR YOU scoring.</p>
      <form className="player-connect-form" onSubmit={submit}>
        <input inputMode="numeric" pattern="[0-9]*" value={value} onChange={event => setValue(event.target.value.replace(/\D/g, ''))} placeholder="Dota ID" aria-label="Dota account ID" />
        <button className="primary-button" type="submit">CONNECT</button>
      </form>
      <button className="player-detect-button" onClick={() => detect(false)} disabled={detecting}>{detecting ? 'CHECKING LIVE SYNC…' : 'DETECT FROM LIVE SYNC'}</button>
      <small className="player-connect-help">{status || 'Your Dota ID is stored only in this browser. Live detection only contacts 127.0.0.1 after you ask it to.'}</small>
    </>}
  </section>;
}
