import { useEffect, useMemo, useState } from 'react';
import { fetchHeroEvidence } from '../services/openDota';

const signed = value => value == null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)} pp`;
const name = hero => hero?.localized_name || 'Unknown';
const games = row => Number(row?.games_played || row?.games || 0);
const edgeFrom = (rows, enemyId) => {
  const baselineRows = rows.filter(row => games(row) > 0);
  const total = baselineRows.reduce((acc, row) => ({ g: acc.g + games(row), w: acc.w + Number(row.wins || 0) }), { g: 0, w: 0 });
  const matchup = rows.find(row => Number(row.hero_id) === Number(enemyId));
  if (!matchup || !games(matchup) || !total.g) return null;
  const winRate = Number(matchup.wins || 0) / games(matchup);
  return { edge: Math.max(-25, Math.min(25, 100 * (winRate - total.w / total.g))), games: games(matchup), winRate, provider: matchup._provider || null };
};

export default function MatchupAtlas({ hero, allies = [], enemies = [], patch }) {
  const team = useMemo(() => [hero, ...allies].filter(Boolean).filter((row, i, arr) => arr.findIndex(item => Number(item.id) === Number(row.id)) === i).slice(0, 5), [hero, allies]);
  const [evidence, setEvidence] = useState(new Map());
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(team.map(async member => {
      try { return [Number(member.id), await fetchHeroEvidence(member.id)]; }
      catch { return [Number(member.id), { matchups: [], synergy: [] }]; }
    })).then(rows => { if (!cancelled) setEvidence(new Map(rows)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [team.map(row => row.id).join(',')]);

  const matrix = useMemo(() => team.map(member => {
    const rows = evidence.get(Number(member.id))?.matchups || [];
    const cells = enemies.slice(0, 5).map(enemy => edgeFrom(rows, enemy.id));
    const known = cells.filter(Boolean);
    return { member, cells, total: known.length ? known.reduce((sum, cell) => sum + cell.edge, 0) : null, known: known.length };
  }), [team, enemies, evidence]);
  const synergy = useMemo(() => team.map(member => {
    const rows = evidence.get(Number(member.id))?.synergy || [];
    return { member, partners: team.filter(other => Number(other.id) !== Number(member.id)).map(other => {
      const row = rows.find(sample => Number(sample.hero_id) === Number(other.id));
      const n = games(row);
      return { other, n, winRate: n ? Number(row.wins || 0) / n * 100 : null };
    }) };
  }), [team, evidence]);

  return <section className="gpv2-atlas gpv2-card">
    <div className="gpv2-card-head gpv2-atlas-head">
      <div><span>FULL DRAFT MATCHUP MATRIX</span><strong>All five allied heroes versus all five enemies</strong></div>
      <small>Public hero matchups · patch {patch?.id || 'current'} {loading ? '· updating…' : ''}</small>
    </div>
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <table className="dotasage-matrix" style={{ borderCollapse: 'separate', borderSpacing: 4, width: '100%', minWidth: 590, textAlign: 'center' }}>
        <thead><tr><th style={{ textAlign: 'left' }}>ALLY / ENEMY</th>{enemies.slice(0, 5).map(enemy => <th key={enemy.id} title={name(enemy)}>{name(enemy)}</th>)}<th>NET EDGE</th></tr></thead>
        <tbody>{matrix.map(row => <tr key={row.member.id}>
          <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>{name(row.member)}</th>
          {enemies.slice(0, 5).map((enemy, i) => <td key={enemy.id} title={row.cells[i] ? `${row.cells[i].games} games · ${row.cells[i].provider || 'public'}` : 'No public matchup sample'} style={{ padding: '10px 6px', borderRadius: 5, color: row.cells[i] == null ? 'inherit' : row.cells[i].edge > 0 ? '#65dfad' : row.cells[i].edge < 0 ? '#ff8b9d' : 'inherit', background: 'rgba(130,130,160,.09)' }}>{signed(row.cells[i]?.edge)}</td>)}
          <td title={`${row.known} of ${enemies.length} enemy pairings sampled`}><strong>{signed(row.total)}</strong><small style={{ display: 'block' }}>{row.known}/{enemies.length} known</small></td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="gpv2-atlas-foot">Positive values favor the allied hero relative to its matchup baseline. Net edge sums only known matchups; — means no sample, not a neutral result. Historical associations are not guaranteed outcomes.</p>
    {team.length > 1 && <div className="gpv2-atlas-synergy">
      <div className="gpv2-card-head"><div><span>ALLIED SYNERGY</span><strong>Same-team performance (not ally-vs-ally counters)</strong></div></div>
      <div style={{ display: 'grid', gap: 8, padding: '8px 0' }}>{synergy.map(row => <div key={row.member.id}><strong>{name(row.member)}</strong> {row.partners.map(pair => <span key={pair.other.id} style={{ display: 'inline-block', margin: '4px 8px 4px 0', padding: '5px 8px', background: 'rgba(130,130,160,.12)', borderRadius: 5 }} title={pair.n ? `${pair.n} same-team games` : 'No public synergy sample'}>{name(pair.other)}: {pair.winRate == null ? '—' : `${pair.winRate.toFixed(1)}% WR`}</span>)}</div>)}</div>
      <p className="gpv2-atlas-foot">Synergy needs same-team pair samples. Missing samples stay unknown; no counter score is substituted.</p>
    </div>}
  </section>;
