import { useEffect, useMemo, useState } from 'react';
import { fetchHeroMatchups } from '../services/openDota';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function signedPoints(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const n = Number(value);
  return `${n > 0 ? '+' : ''}${n.toFixed(1)} pp`;
}

export default function MatchupAtlas({ hero, allies = [], enemies = [], patch }) {
  const [status, setStatus] = useState('loading');
  const [matchups, setMatchups] = useState([]);
  const [sort, setSort] = useState('team');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetchHeroMatchups(hero.id)
      .then(rows => {
        if (cancelled) return;
        setMatchups(Array.isArray(rows) ? rows : []);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [hero.id]);

  const rows = useMemo(() => {
    const byId = new Map(matchups.map(row => [Number(row.hero_id), row]));
    const totals = matchups.reduce((acc, row) => {
      const games = Number(row.games_played || 0);
      const wins = Number(row.wins || 0);
      if (games > 0) { acc.games += games; acc.wins += wins; }
      return acc;
    }, { games: 0, wins: 0 });
    const baseline = totals.games ? totals.wins / totals.games : 0.5;

    const selected = [
      ...(allies || []).filter(row => Number(row.id) !== Number(hero.id)).map(row => ({ hero: row, team: 'ally' })),
      ...(enemies || []).filter(row => Number(row.id) !== Number(hero.id)).map(row => ({ hero: row, team: 'enemy' })),
    ].filter((row, index, all) => all.findIndex(candidate => Number(candidate.hero.id) === Number(row.hero.id)) === index);

    return selected.map(({ hero: otherHero, team }) => {
      const sample = byId.get(Number(otherHero.id));
      const games = Number(sample?.games_played || 0);
      const wins = Number(sample?.wins || 0);
      const winRate = games ? wins / games : null;
      const edge = winRate == null ? null : clamp((winRate - baseline) * 100, -25, 25);
      return { hero: otherHero, team, games, winRate, edge };
    });
  }, [allies, enemies, hero.id, matchups]);

  const providers = useMemo(() => [...new Set(matchups.map(row => row?._provider).filter(Boolean))], [matchups]);
  const providerLabel = providers.length ? providers.join(' + ') : 'public matchup data';

  const visible = useMemo(() => [...rows].sort((a, b) => {
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
    if (a.team !== b.team) return a.team === 'ally' ? -1 : 1;
    return String(a.hero.localized_name || '').localeCompare(String(b.hero.localized_name || ''));
  }), [rows, sort]);

  return <section className="gpv2-atlas gpv2-card">
    <div className="gpv2-card-head gpv2-atlas-head">
      <div><span>DRAFT MATCHUP CHART</span><strong>{hero.localized_name} vs only the heroes in this game</strong></div>
      <small>4 teammates + 5 enemies max · {providerLabel} · patch {patch?.id || 'current'}</small>
    </div>

    <div className="gpv2-atlas-controls draft-only">
      <div className="gpv2-atlas-scope">No full hero board here — this chart follows the entered draft only.</div>
      <div>{[['team', 'TEAM'], ['hardest', 'HARDEST'], ['best', 'BEST']].map(([value, label]) => <button className={sort === value ? 'active' : ''} key={value} onClick={() => setSort(value)}>{label}</button>)}</div>
    </div>

    {status === 'loading' && <p className="gpv2-atlas-status">Loading matchup evidence for this draft…</p>}
    {status === 'error' && <p className="gpv2-atlas-status">Public matchup providers are unavailable right now.</p>}
    {status === 'ready' && <>
      <div className="gpv2-atlas-legend"><span className="ally">ALLY · REFERENCE ONLY</span><span className="drafted">ENEMY</span><span>WR = {hero.localized_name}'s historical win rate against that hero</span></div>
      <div className="gpv2-atlas-grid draft-only-grid">
        {visible.map(row => <article key={row.hero.id} className={`${row.team} ${row.edge == null ? 'unknown' : row.edge >= 0 ? 'positive' : 'negative'}`}>
          <img src={row.hero.portrait} alt="" loading="lazy" />
          <div className="gpv2-atlas-copy"><b>{row.hero.localized_name}</b><em>{row.team === 'ally' ? 'ALLY · REFERENCE' : 'ENEMY'}</em><small>{row.games ? `${row.games.toLocaleString()} games · ${matchups.find(sample => Number(sample.hero_id) === Number(row.hero.id))?._provider || providerLabel}` : 'no public sample'}</small></div>
          <div className="gpv2-atlas-numbers"><strong>{row.winRate == null ? '—' : `${(row.winRate * 100).toFixed(1)}%`}</strong><span>{signedPoints(row.edge)}</span></div>
        </article>)}
      </div>
      <p className="gpv2-atlas-foot">Ally rows are direct head-to-head history for context, not same-team synergy. Enemy rows are the relevant counter evidence for this draft. Source: {providerLabel}.</p>
    </>}
  </section>;
}
