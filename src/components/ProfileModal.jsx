import { useMemo, useState } from 'react';

function formatDuration(seconds) {
  const total = Number(seconds || 0);
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(epoch) {
  if (!epoch) return '—';
  return new Date(Number(epoch) * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

function didWin(match) {
  const radiant = Number(match.player_slot || 0) < 128;
  return Boolean(match.radiant_win) === radiant;
}

function summarizeMatches(matches = []) {
  if (!matches.length) return { count: 0, wins: 0, losses: 0, wr: null, kda: '—', gpm: null, xpm: null };
  let wins = 0, kills = 0, deaths = 0, assists = 0, gpm = 0, xpm = 0, rich = 0;
  matches.forEach(match => {
    if (didWin(match)) wins += 1;
    if (match.kills != null) {
      kills += Number(match.kills || 0); deaths += Number(match.deaths || 0); assists += Number(match.assists || 0);
      gpm += Number(match.gold_per_min || 0); xpm += Number(match.xp_per_min || 0); rich += 1;
    }
  });
  return { count: matches.length, wins, losses: matches.length - wins, wr: wins / matches.length * 100, kda: rich ? `${(kills/rich).toFixed(1)} / ${(deaths/rich).toFixed(1)} / ${(assists/rich).toFixed(1)}` : '—', gpm: rich ? Math.round(gpm/rich) : null, xpm: rich ? Math.round(xpm/rich) : null };
}

function MatchRow({ match, hero }) {
  const win = didWin(match);
  return <a className={`recent-match-row ${win ? 'win' : 'loss'}`} href={`https://www.opendota.com/matches/${match.match_id}`} target="_blank" rel="noreferrer">
    {hero ? <img src={hero.portrait} alt="" /> : <div className="mini-hero-fallback" />}
    <div className="match-main"><strong>{hero?.localized_name || `Hero ${match.hero_id}`}</strong><span>{formatDate(match.start_time)} · {formatDuration(match.duration)}</span></div>
    <div className="match-kda"><b>{match.kills ?? '—'}/{match.deaths ?? '—'}/{match.assists ?? '—'}</b><span>{match.gold_per_min || '—'} GPM · {match.xp_per_min || '—'} XPM</span></div>
    <em>{win ? 'WIN' : 'LOSS'}</em>
  </a>;
}

export default function ProfileModal({ open, onClose, profile, player, winLoss, recentMatches = [], allMatches = [], historyLoading = false, historyError = false, playerHeroRows = [], heroes = [], recentSummary }) {
  const [tab, setTab] = useState('overview');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyQuery, setHistoryQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(100);

  const byId = new Map(heroes.map(h => [Number(h.id), h]));
  const topHeroes = [...playerHeroRows].sort((a,b) => Number(b.games || 0) - Number(a.games || 0)).slice(0, 20);
  const heroHistoryGames = playerHeroRows.reduce((sum, row) => sum + Number(row.games || 0), 0);
  const avatar = player?.profile?.avatarfull || player?.profile?.avatarmedium;
  const name = player?.profile?.personaname || profile.displayName;
  const total = Number(winLoss?.win || 0) + Number(winLoss?.lose || 0);
  const wr = total ? Number(winLoss?.win || 0) / total * 100 : null;
  const allSummary = summarizeMatches(allMatches);
  const publicCoverage = total && allMatches.length ? allMatches.length / total * 100 : null;

  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    return allMatches.filter(match => {
      if (historyFilter === 'win' && !didWin(match)) return false;
      if (historyFilter === 'loss' && didWin(match)) return false;
      if (q) {
        const hero = byId.get(Number(match.hero_id));
        if (!(hero?.localized_name || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allMatches, historyFilter, historyQuery, heroes]);

  if (!open) return null;

  return (
    <div className="profile-modal-backdrop" onMouseDown={onClose}>
      <section className="profile-modal v07-profile-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="profile-modal-head">
          <div className="profile-modal-identity">
            {avatar ? <img src={avatar} alt="" /> : <div className="avatar-fallback">Z</div>}
            <div><div className="eyebrow">PLAYER INTELLIGENCE</div><h2>{name}</h2><span>Dota ID {profile.accountId}</span></div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="profile-tabs"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>OVERVIEW</button><button className={tab==='history'?'active':''} onClick={()=>setTab('history')}>ALL PUBLIC MATCHES <span>{historyLoading ? '…' : allMatches.length ? allMatches.length.toLocaleString() : ''}</span></button></div>

        <div className="profile-stat-grid v07-profile-stats">
          <div><span>OPEN DOTA W/L</span><strong>{total ? total.toLocaleString() : '—'}</strong><small>/wl indexed results</small></div>
          <div><span>WINS</span><strong>{winLoss?.win != null ? Number(winLoss.win).toLocaleString() : '—'}</strong><small>OpenDota /wl</small></div>
          <div><span>LOSSES</span><strong>{winLoss?.lose != null ? Number(winLoss.lose).toLocaleString() : '—'}</strong><small>OpenDota /wl</small></div>
          <div><span>WIN RATE</span><strong>{wr == null ? '—' : `${wr.toFixed(1)}%`}</strong><small>indexed W/L</small></div>
          <div><span>HERO HISTORY</span><strong>{heroHistoryGames ? heroHistoryGames.toLocaleString() : '—'}</strong><small>sum of /heroes games</small></div>
          <div><span>PUBLIC MATCH ROWS</span><strong>{historyLoading ? '…' : allMatches.length ? allMatches.length.toLocaleString() : '—'}</strong><small>{publicCoverage == null ? 'loaded from /matches' : `${publicCoverage.toFixed(0)}% of /wl count`}</small></div>
          <div><span>RECENT</span><strong>{recentSummary?.winRate == null ? '—' : `${recentSummary.winRate.toFixed(0)}%`}</strong><small>last {recentSummary?.count || 0}</small></div>
          <div><span>K / D / A</span><strong>{recentSummary?.kda || '—'}</strong><small>recent average</small></div>
        </div>

        {tab === 'overview' ? <div className="profile-modal-grid">
          <section className="profile-detail-card">
            <div className="profile-detail-head"><div><div className="eyebrow">HERO HISTORY</div><h3>Most Played</h3></div><span>top 20</span></div>
            <div className="profile-hero-list">
              {topHeroes.map(row => {
                const hero = byId.get(Number(row.hero_id));
                const games = Number(row.games || 0); const wins = Number(row.win || 0);
                return <div className="profile-hero-row" key={row.hero_id}>
                  {hero ? <img src={hero.portrait} alt="" /> : <div className="mini-hero-fallback" />}
                  <div><strong>{hero?.localized_name || `Hero ${row.hero_id}`}</strong><span>{games.toLocaleString()} games · {games ? `${(wins/games*100).toFixed(1)}% WR` : '—'}</span></div>
                  <b>{games ? `${wins}-${games-wins}` : '—'}</b>
                </div>;
              })}
            </div>
          </section>

          <section className="profile-detail-card recent-matches-card">
            <div className="profile-detail-head"><div><div className="eyebrow">MATCH HISTORY</div><h3>Recent Games</h3></div><span>click any match → OpenDota</span></div>
            <div className="recent-match-list">{recentMatches.slice(0, 20).map(match => <MatchRow key={match.match_id} match={match} hero={byId.get(Number(match.hero_id))} />)}</div>
          </section>
        </div> : <section className="full-history-panel">
          <div className="history-toolbar">
            <div><div className="eyebrow">PUBLIC HISTORY</div><h3>All match rows OpenDota currently returns</h3><p>{historyLoading ? 'Loading history in pages…' : historyError ? 'Full history request failed; recent and hero history are still available.' : allMatches.length ? `${allSummary.count.toLocaleString()} rows loaded · ${allSummary.wr?.toFixed(1) ?? '—'}% WR · ${allSummary.kda} K/D/A across rows with detailed stats.` : 'No full-history rows returned yet.'}</p></div>
            <div className="history-controls"><input value={historyQuery} onChange={e=>{setHistoryQuery(e.target.value);setVisibleCount(100);}} placeholder="Filter by hero…" /><button className={historyFilter==='all'?'active':''} onClick={()=>setHistoryFilter('all')}>ALL</button><button className={historyFilter==='win'?'active':''} onClick={()=>setHistoryFilter('win')}>WINS</button><button className={historyFilter==='loss'?'active':''} onClick={()=>setHistoryFilter('loss')}>LOSSES</button></div>
          </div>
          <div className="history-summary-strip"><span><b>{allSummary.wins.toLocaleString()}</b> wins in loaded rows</span><span><b>{allSummary.losses.toLocaleString()}</b> losses</span><span><b>{allSummary.gpm || '—'}</b> avg GPM*</span><span><b>{allSummary.xpm || '—'}</b> avg XPM*</span><small>*only rows where OpenDota includes those detailed fields</small></div>
          <div className="all-match-list">{filteredHistory.slice(0, visibleCount).map(match => <MatchRow key={match.match_id} match={match} hero={byId.get(Number(match.hero_id))} />)}{visibleCount < filteredHistory.length && <button className="load-more-history" onClick={()=>setVisibleCount(v=>v+100)}>SHOW 100 MORE · {filteredHistory.length-visibleCount} REMAINING</button>}</div>
        </section>}
        <div className="profile-privacy-note">OpenDota exposes separate player W/L, hero-history, recent-match, and player-match endpoints, so their counts can legitimately differ. v0.8 pages history by the number of rows the API actually returns to avoid skipping capped pages. DotaSage labels each source instead of pretending one number is your definitive client lifetime total. Full history loads only when you open this profile.</div>
      </section>
    </div>
  );
}
