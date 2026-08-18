import ScorePill from './ScorePill';

export const positionOptions = [
  ['all', 'FLEX'], ['safe', 'SAFE · 1'], ['mid', 'MID · 2'], ['off', 'OFF · 3'],
  ['support4', 'SUPPORT · 4'], ['support5', 'HARD SUP · 5'], ['jungle', 'JUNGLE'], ['roam', 'ROAM'],
];

export const advisorModes = [
  ['best', 'BEST PICK'], ['counter', 'COUNTER'], ['meta', 'META'], ['personal', 'FOR YOU'], ['learn', 'LEARN'],
];

function reasonFor(entry, mode) {
  const { score, personal } = entry;
  if (mode === 'counter') return score.enemyScore >= 4 ? 'Strong counter profile into this enemy five' : 'Best available matchup score';
  if (mode === 'meta') return 'Highest current public-stat meta signal in this role';
  if (mode === 'personal') return personal?.games ? `${personal.games} games in your history` : 'Low sample, but still draft-viable';
  if (mode === 'learn') return 'Strong draft fit outside your usual comfort pool';
  if (score.enemyScore >= 5) return 'Excellent into the entered enemy draft';
  if (score.synergyScore >= 4) return 'Strong modeled synergy with the allies already entered';
  if (score.metaScore >= 7) return 'Strong current meta baseline';
  return 'Best combined draft fit available';
}

function PrimaryPick({ entry, onPick, mode, draftComplete }) {
  const { hero, score, personal } = entry;
  return <article className="primary-pick-card">
    <div className="primary-pick-art"><img src={hero.portrait} alt="" /><span>#1</span></div>
    <div className="primary-pick-copy">
      <div className="primary-pick-title"><div><span>TOP RECOMMENDATION</span><strong>{hero.localized_name}</strong></div><b>{score.draftFit.toFixed(1)}</b></div>
      <p>{reasonFor(entry, mode)}{personal?.games ? ` · you: ${personal.games} games` : ' · low personal experience'}</p>
      <div className="advisor-score-row"><ScorePill label="VS" value={score.enemyScore} signed /><ScorePill label="SYN" value={score.synergyScore} signed /><ScorePill label="META" value={score.metaScore} /><ScorePill label="YOU" value={score.personalFit / 10} /></div>
      <button onClick={() => onPick(hero, 'self')}>LOCK PICK{draftComplete ? ' · GAME PLAN READY' : ''} <span>→</span></button>
    </div>
  </article>;
}


function AdvisorSignals({ entry }) {
  if (!entry) return null;
  const { score, personal, pairs = [] } = entry;
  const verifiedPairs = pairs.filter(row => row?.hero && Number(row.games || 0) > 0);
  const signals = [
    ['ENEMY FIT', Math.max(0, Math.min(10, 5 + score.enemyScore / 2)), score.enemyScore >= 0 ? `+${score.enemyScore.toFixed(1)} counter edge` : `${score.enemyScore.toFixed(1)} counter pressure`],
    ['SYNERGY', Math.max(0, Math.min(10, 5 + score.synergyScore / 2)), `${score.synergyScore >= 0 ? '+' : ''}${score.synergyScore.toFixed(1)} modeled ally fit`],
    ['META', score.metaScore, 'current public baseline'],
  ];
  return <div className="advisor-signal-rail">
    <div className="advisor-signal-title"><span>WHY #1</span><small>{personal?.games ? `${personal.games} personal games · experience shown, not required` : 'low experience · coach still shows the objective pick'}</small></div>
    <div className="advisor-signal-bars">{signals.map(([label,value,note]) => <div key={label}><span><b>{label}</b><small>{note}</small></span><i><em style={{width:`${Math.max(3,Math.min(100,Number(value||0)*10))}%`}} /></i><strong>{Number(value||0).toFixed(1)}</strong></div>)}</div>
    {verifiedPairs.length > 0 && <div className="advisor-matchup-strip"><div><b>ENEMY FIVE</b><small>empirical pair evidence · accumulated VS {score.enemyScore >= 0 ? '+' : ''}{score.enemyScore.toFixed(1)}</small></div><div className="advisor-matchup-chips">{verifiedPairs.slice(0,5).map(row => <span key={row.hero.id} title={`${row.hero.localized_name} · ${row.games.toLocaleString()} samples`}><img src={row.hero.portrait} alt=""/><i>{row.hero.localized_name}</i><strong className={row.score >= 0 ? 'positive' : 'negative'}>{row.score > 0 ? '+' : ''}{row.score.toFixed(1)}</strong></span>)}</div></div>}
    {(personal?.games || 0) < 8 && <div className="execution-risk"><b>COACH NOTE</b><span>#1 is the objective draft pick, but your personal sample is low. Treat it as a strong learning pick, not a promise that execution will be easy.</span></div>}
  </div>;
}

function CompactPick({ entry, rank, onPick }) {
  const { hero, score, personal } = entry;
  return <button className="compact-pick" onClick={() => onPick(hero, 'self')}>
    <span className="compact-rank">{rank}</span><img src={hero.portrait} alt="" />
    <span className="compact-name"><strong>{hero.localized_name}</strong><small>{personal?.games ? `${personal.games} games` : 'new / low sample'}</small></span>
    <span className="compact-metric"><small>DRAFT</small><b>{score.draftFit.toFixed(1)}</b></span>
    <span className="compact-metric"><small>VS</small><b className={score.enemyScore >= 0 ? 'positive' : 'negative'}>{score.enemyScore > 0 ? '+' : ''}{score.enemyScore.toFixed(1)}</b></span><span className="compact-metric syn-metric"><small>SYN</small><b className={score.synergyScore >= 0 ? 'positive' : 'negative'}>{score.synergyScore > 0 ? '+' : ''}{score.synergyScore.toFixed(1)}</b></span><span className="compact-arrow">→</span>
  </button>;
}

export default function RecommendationPanel({ recommendations, onPick, laneLabel, laneFilter, setLaneFilter, matrixLoading, advisorMode, setAdvisorMode, draftComplete = false, allyCount = 0, enemyCount = 0, playerSide = 'radiant' }) {
  const top = recommendations[0];
  const draftContext = enemyCount
    ? `${enemyCount}/5 enemies · ${allyCount}/5 allies`
    : `${allyCount}/5 allies · no enemy counters yet`;
  return <section className="recommend-panel glass-panel advisor-panel">
    <div className="recommend-head advisor-head"><div><div className="eyebrow">PICK ADVISOR · {laneLabel} · {playerSide.toUpperCase()}</div><h2>What should you pick?</h2></div><div className="advisor-live-block"><div className={`matrix-indicator ${matrixLoading ? 'busy' : ''}`}><i />{matrixLoading ? 'Re-ranking…' : 'Live draft ranking'}</div><small className="draft-context">USES {draftContext.toUpperCase()}</small></div></div>
    <div className="advisor-controls"><div className="advisor-modes">{advisorModes.map(([key,label]) => <button key={key} className={advisorMode === key ? 'active' : ''} onClick={() => setAdvisorMode(key)}>{label}</button>)}</div><div className="position-picker compact-position-picker"><span>YOUR POSITION</span><div>{positionOptions.map(([key,label]) => <button key={key} className={laneFilter === key ? 'active' : ''} onClick={() => setLaneFilter(key)}>{label}</button>)}</div></div></div>
    {top ? <><div className="advisor-results"><PrimaryPick entry={top} onPick={onPick} mode={advisorMode} draftComplete={draftComplete} /><div className="compact-pick-list">{recommendations.slice(1,7).map((entry,i)=><CompactPick key={entry.hero.id} entry={entry} rank={i+2} onPick={onPick} />)}</div></div><AdvisorSignals entry={top} /></> : <div className="empty-state"><strong>No eligible heroes for this position.</strong><span>Try Flex or another role.</span></div>}
    <div className="recommend-foot v08-recommend-foot"><span><b>ADVANTAGE MODE</b> 60% empirical counters · 35% modeled synergy · 5% meta</span><span><b>YOU</b> shown separately; not used to rank BEST PICK</span></div>
  </section>;
}
