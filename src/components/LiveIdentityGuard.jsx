import { useEffect, useState } from 'react';
import { fetchLocalGameState } from '../services/localGsi';
import { fetchPlayer } from '../services/openDota';
import { loadPlayerSnapshot } from '../services/playerStorage';
import '../styles/live-identity-guard.css';

function activatePlayer(accountId) {
  const id = String(accountId || '');
  if (!/^\d+$/.test(id)) return;
  try {
    localStorage.setItem('dotasage:player-account-id', id);
    localStorage.setItem('dotasage:player-source', 'live');
  } catch {}
  window.location.reload();
}

export default function LiveIdentityGuard({ activeAccountId }) {
  const [detectedId, setDetectedId] = useState(null);
  const [detectedName, setDetectedName] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timer;

    const poll = async () => {
      let enabled = false;
      try { enabled = sessionStorage.getItem('dotasage:live-sync-enabled') === '1'; } catch {}
      if (!enabled) {
        if (!cancelled) setDetectedId(null);
        return;
      }
      const state = await fetchLocalGameState();
      if (cancelled) return;
      setDetectedId(state?.connected && state?.player?.account_id ? String(state.player.account_id) : null);
    };

    poll();
    timer = window.setInterval(poll, 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDetectedName(null);
    if (!detectedId) return undefined;
    const snapshot = loadPlayerSnapshot(detectedId);
    if (snapshot?.name) setDetectedName(snapshot.name);
    (async () => {
      try {
        const player = await fetchPlayer(detectedId);
        if (!cancelled && player?.profile?.personaname) setDetectedName(player.profile.personaname);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [detectedId]);

  if (!activeAccountId || !detectedId || String(activeAccountId) === String(detectedId)) return null;

  return <div className="live-identity-warning" role="status">
    <div>
      <strong>LIVE PLAYER ≠ ACTIVE PROFILE</strong>
      <span>Live Sync sees {detectedName || `Dota ID ${detectedId}`}, but DotaSage is analyzing Dota ID {activeAccountId}. Live inventory/coaching should not be mixed with another player's history.</span>
    </div>
    <button onClick={() => activatePlayer(detectedId)}>USE LIVE PLAYER</button>
  </div>;
}
