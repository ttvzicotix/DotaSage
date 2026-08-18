import { useState } from 'react';

const dimensions = [
  ['Carry', 'Carry'], ['Nuker', 'Nuking'], ['Disabler', 'Control'], ['Durable', 'Tank'], ['Pusher', 'Push'], ['Initiator', 'Initiation'],
];

function scoreRole(heroes, role) {
  if (!heroes.length) return 0;
  const count = heroes.filter(hero => (hero.roles || []).some(r => String(r).toLowerCase() === role.toLowerCase())).length;
  return Math.min(10, count * 2);
}

function ProfileBar({ role, label, allies, enemies }) {
  const us = scoreRole(allies, role); const them = scoreRole(enemies, role);
  return <div className="profile-bar-row"><div className="profile-bar-title"><span>{label}</span><b>{us.toFixed(0)}</b><i>{them.toFixed(0)}</i></div><div className="duel-bars"><div className="ally-bar"><span style={{ width: `${us * 10}%` }} /></div><div className="enemy-bar"><span style={{ width: `${them * 10}%` }} /></div></div></div>;
}

function durationMinutes(bin) { const n = Number(bin || 0); return n > 120 ? n / 60 : n; }

function buildCurve(heroes, durationData) {
  if (!heroes.length) return [];
  const bins = new Map();
  for (const hero of heroes) {
    const rows = durationData.get(hero.id) || [];
    for (const row of rows) {
      const games = Number(row.games_played || 0); const wins = Number(row.wins || 0);
      if (games < 20 || !Number.isFinite(wins)) continue;
      const minute = Math.round(durationMinutes(row.duration_bin));
      if (minute < 10 || minute > 65) continue;
      const wr = wins / games;
      if (!Number.isFinite(wr)) continue;
      if (!bins.has(minute)) bins.set(minute, []);
      bins.get(minute).push({ wr, weight: Math.min(1, Math.sqrt(games / 400)) });
    }
  }
  return [...bins.entries()].sort((a,b)=>a[0]-b[0]).map(([minute, rows]) => {
    const weight = rows.reduce((s,r)=>s+r.weight,0) || 1;
    return { minute, wr: rows.reduce((s,r)=>s+r.wr*r.weight,0)/weight, heroes: rows.length };
  }).filter(x => x.heroes >= Math.min(2, heroes.length) && Number.isFinite(x.wr));
}

function TimingChart({ allies, enemies, durationData, loading }) {
  const [hover, setHover] = useState(null);
  const us = buildCurve(allies, durationData); const them = buildCurve(enemies, durationData);
  const allMinutes = [...new Set([...us.map(x=>x.minute), ...them.map(x=>x.minute)])].sort((a,b)=>a-b);
  if (loading && !allMinutes.length) return <div className="curve-empty">Loading empirical duration profiles…</div>;
  if (!allMinutes.length) return <div className="curve-empty">Add heroes to build an empirical timing profile.</div>;
  const minM = Math.min(...allMinutes), maxM = Math.max(...allMinutes);
  const x = m => 12 + ((m-minM)/Math.max(1,maxM-minM))*196;
  const y = wr => 82 - ((Math.max(.40, Math.min(.60, wr))-.40)/.20)*68;
  const points = rows => rows.map(r => `${x(r.minute).toFixed(1)},${y(r.wr).toFixed(1)}`).join(' ');
  const point = (r, side) => <circle key={`${side}${r.minute}`} cx={x(r.minute)} cy={y(r.wr)} r="3.7" className={`curve-dot ${side}`} tabIndex="0"
      onMouseEnter={() => setHover({ side, ...r, cx:x(r.minute), cy:y(r.wr) })}
      onMouseLeave={() => setHover(null)} onFocus={() => setHover({ side, ...r, cx:x(r.minute), cy:y(r.wr) })} onBlur={() => setHover(null)} />;
  return <div className="timing-chart v08-timing-chart">
    <div className="curve-legend"><span className="us">YOUR HEROES</span><span className="them">ENEMY HEROES</span></div>
    <div className="curve-canvas">
      <svg viewBox="0 0 220 98" role="img" aria-label="Average hero win rate by match duration">
        <line x1="12" y1="48" x2="208" y2="48" className="curve-mid" />
        {[minM, Math.round((minM+maxM)/2), maxM].map(m => <text key={m} x={x(m)} y="96" textAnchor="middle">{m}m</text>)}
        {us.length > 1 && <polyline points={points(us)} className="curve-line us" />}
        {them.length > 1 && <polyline points={points(them)} className="curve-line them" />}
        {us.map(r => point(r,'us'))}{them.map(r => point(r,'them'))}
      </svg>
      {hover && <div className={`curve-tooltip ${hover.side}`} style={{ left:`${(hover.cx/220)*100}%`, top:`${(hover.cy/98)*100}%` }}><b>{hover.side === 'us' ? 'YOUR HEROES' : 'ENEMY HEROES'}</b><strong>{(hover.wr*100).toFixed(1)}%</strong><span>{hover.minute} min · {hover.heroes} hero sample{hover.heroes===1?'':'s'}</span></div>}
    </div>
    <p>Hover any dot for the exact win-rate percentage. Average individual hero performance by match duration, <b>not</b> team win probability.</p>
  </div>;
}

export default function DraftInsights({ draft, matrixLoading, durationData = new Map(), durationLoading = false }) {
  return <aside className="draft-insights glass-panel">
    <div className="panel-head compact-head"><div><div className="eyebrow">TEAM PROFILE</div><h2>Draft Pulse</h2></div><span className={`pulse-dot ${matrixLoading ? 'busy' : ''}`} /></div>
    <div className="duel-legend"><span>YOUR TEAM</span><span>ENEMY</span></div>
    <div className="profile-bars">{dimensions.map(([role,label]) => <ProfileBar key={role} role={role} label={label} allies={draft.allies} enemies={draft.enemies} />)}</div>
    <div className="insight-note">Structural profile from current hero role tags. It is intentionally <b>not</b> presented as win probability.</div>
    <div className="insight-section timing-section"><div className="eyebrow">EMPIRICAL TIMING</div><h3>Timing & Power Shape</h3><TimingChart allies={draft.allies} enemies={draft.enemies} durationData={durationData} loading={durationLoading} /></div>
  </aside>;
}
