import { useEffect } from 'react';
import PlayerConnection from './PlayerConnection';
import { clearPlayerCache } from '../services/openDota';
import { forgetPlayerSnapshot, loadPlayerSnapshot, savePlayerSnapshot } from '../services/playerStorage';
import '../styles/player-profile-status.css';

const MEDALS = ['', 'Herald', 'Guardian', 'Crusader', 'Archon', 'Legend', 'Ancient', 'Divine', 'Immortal'];

function rankLabel(rankTier) {
  const rank = Number(rankTier || 0);
  if (!rank) return 'Uncalibrated / private';
  const medal = Math.floor(rank / 10);
  const star = rank % 10;
  if (medal >= 8) return 'Immortal';
  return `${MEDALS[medal] || 'Rank'}${star ? ` ${star}` : ''}`;
}

function mmrEstimate(player) {
  const raw = player?.mmr_estimate?.estimate ?? player?.mmr_estimate;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function profileSource() {
  try { return localStorage.getItem('dotasage:player-source') || 'saved'; }
  catch { return 'saved'; }
}

function ageLabel(timestamp) {
  const age = Date.now() - Number(timestamp || 0);
  if (!Number.isFinite(age) || age < 0) return null;
  const minutes = Math.floor(age / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function savePlayer(rawId, source = 'manual') {
  const value = String(rawId ?? '').trim();
  if (!/^\d+$/.test(value)) return false;
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric) || numeric <= 0 || numeric > 4294967295) return false;
  try {
    localStorage.setItem('dotasage:player-account-id', value);
    localStorage.setItem('dotasage:player-source', source);
  } catch { return false; }
  window.location.reload();
  return true;
}

function forgetPlayer(accountId) {
  try {
    localStorage.removeItem('dotasage:player-account-id');
    localStorage.removeItem('dotasage:player-source');
  } catch {}
  forgetPlayerSnapshot(accountId);
  window.location.reload();
}

function refreshPlayer(accountId, event) {
  event?.stopPropagation?.();
  clearPlayerCache(accountId);
  window.location.reload();
}

export default function PlayerProfile({ profile, player, loading, personalSummary, winLoss, recentSummary, onOpenProfile }) {
  const snapshot = profile.accountId ? loadPlayerSnapshot(profile.accountId) : null;
  const liveAvatar = player?.profile?.avatarfull || player?.profile?.avatarmedium || null;
  const avatar = liveAvatar || snapshot?.avatar || null;
  const liveName = player?.profile?.personaname || null;
  const name = liveName || snapshot?.name || profile.displayName;
  const liveMmr = mmrEstimate(player);
  const mmr = liveMmr || snapshot?.mmr || null;
  const liveTotalGames = Number(winLoss?.win || 0) + Number(winLoss?.lose || 0);
  const totalGames = liveTotalGames || Number(snapshot?.totalGames || 0);
  const overallWr = liveTotalGames
    ? Number(winLoss.win || 0) / liveTotalGames * 100
    : Number.isFinite(Number(snapshot?.overallWr)) ? Number(snapshot.overallWr) : null;
  const effectiveRecent = recentSummary?.count ? recentSummary : snapshot?.recentSummary || recentSummary;
  const effectivePersonal = (!loading && personalSummary?.played)
    ? personalSummary
    : snapshot?.personalSummary || personalSummary;
  const effectiveRankTier = player?.rank_tier ?? snapshot?.rankTier ?? null;
  const usingSavedProfile = !player && Boolean(snapshot?.name);
  const noPublicMatches = !loading && !liveTotalGames && !recentSummary?.count && !personalSummary?.played;
  const savedAge = snapshot?.savedAt ? ageLabel(snapshot.savedAt) : null;
  const dataLabel = loading && !snapshot
    ? 'SYNCING OPENDOTA'
    : usingSavedProfile
      ? `SAVED LOCALLY${savedAge ? ` · ${savedAge}` : ''}`
      : noPublicMatches
        ? 'PROFILE FOUND · NO PUBLIC MATCH HISTORY'
        : 'OPENDOTA DATA';

  useEffect(() => {
    if (!profile.accountId || loading) return;
    const hasUsefulLiveData = Boolean(player || liveTotalGames || recentSummary?.count || personalSummary?.played);
    if (!hasUsefulLiveData) return;
    savePlayerSnapshot(profile.accountId, {
      name,
      avatar,
      rankTier: effectiveRankTier,
      mmr,
      totalGames,
      wins: winLoss?.win ?? snapshot?.wins ?? null,
      losses: winLoss?.lose ?? snapshot?.losses ?? null,
      overallWr,
      recentSummary: effectiveRecent,
      personalSummary: effectivePersonal,
    });
  }, [profile.accountId, loading, player, liveTotalGames, recentSummary, personalSummary, name, avatar, effectiveRankTier, mmr, totalGames, winLoss, overallWr]);

  if (!profile.accountId) {
    return <PlayerConnection accountId={null} source={null} onConnect={savePlayer} onForget={() => {}} />;
  }

  return <>
    <PlayerConnection accountId={profile.accountId} source={profileSource()} onConnect={savePlayer} onForget={() => forgetPlayer(profile.accountId)} />
    <section className="player-card glass-panel clickable-profile" onClick={onOpenProfile} role="button" tabIndex={0} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onOpenProfile?.()} title="Open player profile and match history">
      <div className="player-topline"><span>PLAYER // {usingSavedProfile ? 'SAVED' : 'CONNECTED'}</span><i /></div>
      <div className="player-data-status"><span className={usingSavedProfile ? 'saved' : noPublicMatches ? 'limited' : 'fresh'}>{dataLabel}</span><button onClick={event => refreshPlayer(profile.accountId, event)}>REFRESH OPENDOTA</button></div>
      <div className="player-row">
        <div className="avatar-wrap">
          {avatar ? <img src={avatar} alt="" /> : <div className="avatar-fallback">P</div>}
          <span className="online-dot" />
        </div>
        <div className="player-copy">
          <div className="player-name">{name}</div>
          <div className="player-rank">{loading && !usingSavedProfile ? 'Syncing OpenDota…' : `${rankLabel(effectiveRankTier)}${usingSavedProfile ? ' · saved locally' : ''}`}</div>
          <div className="player-id">ID {profile.accountId}</div>
        </div>
        <div className="mmr-chip"><span>MMR EST.</span><strong>{loading && !snapshot ? '…' : mmr ? mmr.toLocaleString() : '—'}</strong></div>
      </div>
      <div className="profile-metrics profile-metrics-primary">
        <div><strong>{overallWr == null ? '—' : `${overallWr.toFixed(1)}%`}</strong><span>indexed WR</span></div>
        <div><strong>{totalGames ? totalGames.toLocaleString() : '—'}</strong><span>OpenDota W/L index</span></div>
        <div><strong>{effectiveRecent?.winRate == null ? '—' : `${effectiveRecent.winRate.toFixed(0)}%`}</strong><span>recent WR</span></div>
      </div>
      <div className="recent-line">
        <span>RECENT {effectiveRecent?.count || 0}</span>
        <b>{effectiveRecent?.kda || 'KDA —'}</b>
        <b>{effectiveRecent?.gpm ? `${effectiveRecent.gpm} GPM` : 'GPM —'}</b>
        <b>{effectiveRecent?.xpm ? `${effectiveRecent.xpm} XPM` : 'XPM —'}</b>
      </div>
      <div className="profile-pool-line">
        <span><b>{loading && !snapshot ? '…' : effectivePersonal?.comfort ?? 0}</b> comfort</span>
        <span><b>{loading && !snapshot ? '…' : effectivePersonal?.played ?? 0}</b> heroes played</span>
        <span><b>{loading && !snapshot ? '…' : effectivePersonal?.learning ?? 0}</b> low / learning</span>
      </div>
      {noPublicMatches && <div className="profile-availability-note">OpenDota identified this account but returned no public match-history data for the current requests. Objective draft tools still work; personal-history scoring may be unavailable.</div>}
      <div className="profile-open-hint">VIEW PROFILE · HERO HISTORY · RECENT MATCHES <b>→</b></div>
    </section>
  </>;
}
