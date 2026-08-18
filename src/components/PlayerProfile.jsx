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

export default function PlayerProfile({ profile, player, loading, personalSummary, winLoss, recentSummary, onOpenProfile }) {
  const avatar = player?.profile?.avatarfull || player?.profile?.avatarmedium;
  const name = player?.profile?.personaname || profile.displayName;
  const mmr = mmrEstimate(player);
  const totalGames = Number(winLoss?.win || 0) + Number(winLoss?.lose || 0);
  const overallWr = totalGames ? Number(winLoss.win || 0) / totalGames * 100 : null;
  return (
    <section className="player-card glass-panel clickable-profile" onClick={onOpenProfile} role="button" tabIndex={0} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onOpenProfile?.()} title="Open player profile and match history">
      <div className="player-topline"><span>PLAYER // LIVE</span><i /></div>
      <div className="player-row">
        <div className="avatar-wrap">
          {avatar ? <img src={avatar} alt="" /> : <div className="avatar-fallback">Z</div>}
          <span className="online-dot" />
        </div>
        <div className="player-copy">
          <div className="player-name">{name}</div>
          <div className="player-rank">{loading ? 'Syncing OpenDota…' : rankLabel(player?.rank_tier)}</div>
          <div className="player-id">ID {profile.accountId}</div>
        </div>
        <div className="mmr-chip"><span>MMR EST.</span><strong>{loading ? '…' : mmr ? mmr.toLocaleString() : '—'}</strong></div>
      </div>
      <div className="profile-metrics profile-metrics-primary">
        <div><strong>{overallWr == null ? '—' : `${overallWr.toFixed(1)}%`}</strong><span>indexed WR</span></div>
        <div><strong>{totalGames ? totalGames.toLocaleString() : '—'}</strong><span>OpenDota W/L index</span></div>
        <div><strong>{recentSummary?.winRate == null ? '—' : `${recentSummary.winRate.toFixed(0)}%`}</strong><span>recent WR</span></div>
      </div>
      <div className="recent-line">
        <span>RECENT {recentSummary?.count || 0}</span>
        <b>{recentSummary?.kda || 'KDA —'}</b>
        <b>{recentSummary?.gpm ? `${recentSummary.gpm} GPM` : 'GPM —'}</b>
        <b>{recentSummary?.xpm ? `${recentSummary.xpm} XPM` : 'XPM —'}</b>
      </div>
      <div className="profile-pool-line">
        <span><b>{loading ? '…' : personalSummary.comfort}</b> comfort</span>
        <span><b>{loading ? '…' : personalSummary.played}</b> heroes played</span>
        <span><b>{loading ? '…' : personalSummary.learning}</b> low / learning</span>
      </div>
    <div className="profile-open-hint">VIEW PROFILE · HERO HISTORY · RECENT MATCHES <b>→</b></div>
    </section>
  );
}
