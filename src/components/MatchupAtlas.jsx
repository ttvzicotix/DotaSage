import { useEffect, useMemo, useState } from 'react';
import { fetchHeroMatchups, fetchHeroes, portraitUrl } from '../services/openDota';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function signedPoints(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const n = Number(value);
  return `${n > 0 ? '+' : ''}${n.toFixed(1)} pp`;
}

export default function MatchupAtlas({ hero, enemies = [] }) {
  const [status, setStatus] = useState('loading');
  const [matchups, setMatchups] = useState([]);
  const [heroes, setHeroes] = useState([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('az');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    Promise.all([fetchHeroMatchups(hero.id), fetchHeroes()])
      .then(([rows, roster]) => {
        if (cancelled) return;
        setMatchups(Array.isArray(rows) ? rows : []);
        setHeroes(Array.isArray(roster) ? roster : []);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [hero.id]);

  const enemyIds = useMemo(() => new Set((enemies || []).map(row => Number(row.id))), [enemies]);
  const rows = useMemo(() => {
    const byId = new Map(matchups.map(row => [Number(row.hero_id), row]));
    const totals = matchups.reduce((acc, row) => {
      const games = Number(row.games_played || 0);
      const wins = Number(row.wins || 0);
      if (games > 0) { acc.games += games; acc.wins += wins; }
      return acc;
    }, { games: 0, wins: 0 });
    const baseline = totals.games ? totals.wins / totals.games : 0.5;

    return heroes
      .filter(row => Number(row.id) !== Number(hero.id))
      .map(opponent => {
        const sample = byId.get(Number(opponent.id));
        const games = Number(sample?.games_played || 0);
        const wins = Number(sample?.wins || 0);
        const winRate = games ? wins / games : null;
        const edge = winRate == null ? null : clamp((winRate - baseline) * 100, -25, 25);
        return {
          hero: { ...opponent, portrait: opponent.portrait || portraitUrl(opponent) },
          games,
          winRate,
          edge,
          drafted: enemyIds.has(Number(opponent.id)),
        };
      });
  }, [heroes, matchups, hero.id, enemyIds]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? rows.filter(row => String(row.hero.localized_name || '').toLowerCase().includes(q)) : rows;
    return [...filtered].sort((a, b) => {
      if (sort === 'hardest') {
        if (a.edge == null && b.edge != null) return 1;
        if (a.edge != null && b.edge == null) return -1;
        return Number(a.edge || 0) - Number(b.edge || 0);
      }
      if (sort === 'best') {
        if (a.edge == null && b.edge != null) return 1;
        if (a.edge != null && b.edge == null) return -1;
        return Number(b.edge || 0) - Number(a.edge || 0);
      }
      return String(a.hero.localized_name || '').localeCompare(String(b.hero.localized_name || ''));
    });
  }, [rows, query, sort]);

  return <section className="gpv2-atlas gpv2-card">
    <div className="gpv2-card-head gpv2-atlas-head">
      <div><span>HERO MATCHUP ATLAS</span><strong>{hero.localized_name} vs the entire hero field</strong></div>
      <small>OpenDota matchup history · edge is vs this hero's field baseline</small>
    </div>

    <div className="gpv2-atlas-controls">
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter heroes…" aria-label="Filter hero matchup atlas" />
      <div>{[['az', 'A–Z'], ['hardest', 'HARDEST'], ['best', 'BEST']].map(([value, label]) => <button className={sort === value ? 'active' : ''} key={value} onClick={() => setSort(value)}>{label}</button>)}</div>
    </div>

    {status === 'loading' && <p className="gpv2-atlas-status">Loading full matchup field…</p>}
    {status === 'error' && <p className="gpv2-atlas-status">OpenDota matchup data is unavailable right now.</p>}
    {status === 'ready' && <>
      <div className="gpv2-atlas-legend"><span className="drafted">DRAFTED ENEMY</span><span>WR = {hero.localized_name}'s win rate vs that hero</span><span>EDGE = percentage points above/below {hero.localized_name}'s field baseline</span></div>
      <div className="gpv2-atlas-grid">
        {visible.map(row => <article key={row.hero.id} className={`${row.drafted ? 'drafted' : ''} ${row.edge == null ? 'unknown' : row.edge >= 0 ? 'positive' : 'negative'}`}>
          <img src={row.hero.portrait} alt="" loading="lazy" />
          <div className="gpv2-atlas-copy"><b>{row.hero.localized_name}</b>{row.drafted && <em>IN THIS DRAFT</em>}<small>{row.games ? `${row.games.toLocaleString()} games` : 'no public sample'}</small></div>
          <div className="gpv2-atlas-numbers"><strong>{row.winRate == null ? '—' : `${(row.winRate * 100).toFixed(1)}%`}</strong><span>{signedPoints(row.edge)}</span></div>
        </article>)}
      </div>
      <p className="gpv2-atlas-foot">These are population matchup results, not a promise that the lane or game is favorable. Draft composition, role, patch, bracket and player execution still matter.</p>
    </>}
  </section>;
}
