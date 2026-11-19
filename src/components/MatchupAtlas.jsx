import { useEffect, useMemo, useState } from 'react';
import { matchupEdge, alliedPair, draftTeam } from '../engine/teamComparison.js';
import { fetchHeroEvidence } from '../services/openDota';

const signed = value => value == null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)} pp`;
const name = hero => hero?.localized_name || 'Unknown';
export default function MatchupAtlas({ hero, allies = [], enemies = [], patch }) {
  const team = useMemo(() => draftTeam(hero, allies), [hero, allies]);
  const [evidence, setEvidence] = useState(new Map());
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setEvidence(new Map());
    setLoading(true);
    Promise.all(team.map(async member => {
      try { return [Number(member.id), await fetchHeroEvidence(member.id)]; }
      catch { return [Number(member.id), { matchups: [], synergy: [] }]; }
    })).then(rows => { if (!cancelled) setEvidence(new Map(rows)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [team.map(row => row.id).join(','), patch?.id]);

  const matrix = useMemo(() => team.map(member => {
    const rows = evidence.get(Number(member.id))?.matchups || [];
    const cells = enemies.slice(0, 5).map(enemy => matchupEdge(rows, enemy.id));
    const known = cells.filter(Boolean);
    return { member, cells, total: known.length ? known.reduce((sum, cell) => sum + cell.edge, 0) / known.length : null, known: known.length };
  }), [team, enemies, evidence]);
  const synergy = useMemo(() => team.map(member => ({ member,
    partners: team.filter(other => Number(other.id) !== Number(member.id)).map(other => alliedPair(member, other, evidence))
  })), [team, evidence]);
  const yourSynergy = synergy.find(row => Number(row.member.id) === Number(hero?.id));

  return <section className="gpv2-atlas gpv2-card">
    <div className="gpv2-card-head gpv2-atlas-head">
      <div><span>FULL DRAFT MATCHUP MATRIX</span><strong>All five allied heroes versus all five enemies</strong></div>
      <small>Historical samples · current game patch {patch?.id || 'current'} {loading ? '· updating…' : ''}</small>
    </div>
    {!team.length && <p className="comparison-empty">Add your hero or teammates to compare your lineup against the enemy team.</p>}
    {!enemies.length && <p className="comparison-empty">Add enemies to see each teammate’s matchups. Allied synergy is available below.</p>}
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <table className="dotasage-matrix" style={{ borderCollapse: 'separate', borderSpacing: 4, width: '100%', minWidth: 590, textAlign: 'center' }}>
        <thead><tr><th style={{ textAlign: 'left' }}>ALLY / ENEMY</th>{enemies.slice(0, 5).map(enemy => <th key={enemy.id} title={name(enemy)}>{name(enemy)}</th>)}<th>AVG EDGE</th></tr></thead>
        <tbody>{matrix.map(row => <tr key={row.member.id}>
          <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>{name(row.member)}{Number(row.member.id) === Number(hero?.id) ? " (you)" : ""}</th>
          {enemies.slice(0, 5).map((enemy, i) => <td key={enemy.id} title={row.cells[i] ? `${row.cells[i].games} games · ${row.cells[i].provider || 'public'}` : 'No public matchup sample'} style={{ padding: '10px 6px', borderRadius: 5, color: row.cells[i] == null ? 'inherit' : row.cells[i].edge > 0 ? '#65dfad' : row.cells[i].edge < 0 ? '#ff8b9d' : 'inherit', background: 'rgba(130,130,160,.09)' }}>{signed(row.cells[i]?.edge)}</td>)}
          <td title={`${row.known} of ${enemies.length} enemy pairings sampled`}><strong>{signed(row.total)}</strong><small style={{ display: 'block' }}>{row.known}/{enemies.length} known</small></td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="gpv2-atlas-foot">Positive values favor the allied hero relative to its matchup baseline. Average edge uses only known matchups and is not a team win probability; — means no sample, not a neutral result. Historical associations are not guaranteed outcomes.</p>
    {team.length > 1 && <div className="gpv2-atlas-synergy">
      <div className="gpv2-card-head"><div><span>YOUR TEAM SYNERGY</span><strong>{hero ? `${name(hero)} with your teammates` : 'Select your hero to focus on your partnerships'}</strong></div></div>
      <div className="synergy-pair-grid">{(yourSynergy ? [yourSynergy] : synergy).map(row => row.partners.map(pair => <article className="synergy-pair" key={`${row.member.id}-${pair.other.id}`}>
        <strong>{name(row.member)} + {name(pair.other)}</strong>
        <span>{pair.winRate == null ? 'No same-team statistical sample' : `${pair.winRate.toFixed(1)}% pair win rate · ${pair.n.toLocaleString()} games`}</span>
        <b>Role complement: {pair.modeled > 0 ? '+' : ''}{pair.modeled.toFixed(1)} / 10 · modeled</b>
        <p>{pair.explanation}</p>
      </article>))}</div>
      <p className="gpv2-atlas-foot">Role complement is a composition heuristic, not measured win-rate lift. Pair win rates are historical associations, not proof of synergy. Missing statistics stay unknown.</p>
      {yourSynergy && <details className="all-team-synergy"><summary>All teammate partnerships</summary>{synergy.flatMap(row => row.partners.filter(pair => Number(row.member.id) < Number(pair.other.id)).map(pair => <p key={`${row.member.id}-${pair.other.id}`}><strong>{name(row.member)} + {name(pair.other)}</strong>: {pair.winRate == null ? 'No same-team sample' : `${pair.winRate.toFixed(1)}% WR · ${pair.n.toLocaleString()} games`}</p>))}</details>}
    </div>}
  </section>;
}
