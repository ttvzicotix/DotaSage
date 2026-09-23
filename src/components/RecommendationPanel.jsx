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
  if (mode === 'counter') return score.enemyScore >= 4 ? 'Strong counter profile into this enemy draft' : 'Best available matchup score';
  if (mode === 'meta') return 'Highest current public-stat meta signal in this role';
  if (mode === 'personal') return personal?.games ? `${personal.games} games in your public history` : 'Low personal sample, but still draft-viable';
  if (mode === 'learn') return 'Strong draft fit outside your usual comfort pool';
  if (score.enemyScore >= 5) return 'Excellent into the entered enemy draft';
  if (score.synergyScore >= 4) return score.synergySource === 'empirical' ? 'Strong empirical same-team synergy with the allies entered' : 'Strong modeled synergy with the allies already entered';
  if (score.metaScore >= 7) return 'Strong current meta baseline';
  return 'Best combined draft fit available';
}

function evidenceFor(entry, enemyCount = 0) {
  const pairs = Array.isArray(entry?.pairs) ? entry.pairs : [];
  const verified = pairs.filter(row => Number(row?.games || 0) > 0);
  const games = verified.reduce((sum, row) => sum + Number(row.games || 0), 0);
  const avgConfidence = verified.length
    ? verified.reduce((sum, row) => sum + Number(row.confidence || 0), 0) / verified.length
    : 0;
  const expected = Math.max(1, enemyCount);
  const coverage = Math.min(1, verified.length / expected);
  const providers = [...new Set(verified.map(row => row.provider).filter(Boolean))];

  let label = 'LOW';
  if (coverage >= 0.8 && avgConfidence >= 0.8 && games >= 1500) label = 'HIGH';
  else if (coverage >= 0.5 && avgConfidence >= 0.55 && games >= 400) label = 'MED';

  return { verified, games, avgConfidence, coverage, providers, label };
}

function PrimaryPick({ entry, onPick, mode, draftComplete, enemyCount, patch, providerStatus }) {
  const { hero, score, personal } = entry;
  const evidence = evidenceFor(entry, enemyCount);
  const sourceText = evidence.providers.length
    ? evidence.providers.join(' + ')
    : providerStatus?.stratzConfigured
      ? 'STRATZ / OPENDOTA READY'
      : 'PUBLIC MATCH DATA';

  return <article className="primary-pick-card v021-primary-pick">
    <div className="primary-pick-art">
      <img src={hero.portrait} alt="" />
      <span>#1</span>
      <div className={`pick-confidence-badge ${evidence.label.toLowerCase()}`}>
        <small>CONFIDENCE</small><b>{evidence.label}</b>
      </div>
    </div>
    <div className="primary-pick-copy">
      <div className="primary-pick-title">
        <div><span>TOP RECOMMENDATION</span><strong>{hero.localized_name}</strong></div>
        <b>{score.draftFit.toFixed(1)}</b>
      </div>
      <p>{reasonFor(entry, mode)}{personal?.games ? ` · you: ${personal.games} games` : ' · low personal experience'}</p>
      <div className="advisor-score-row">
        <ScorePill label="VS" value={score.enemyScore} signed />
        <ScorePill label="SYN" value={score.synergyScore} signed />
        <ScorePill label="META" value={score.metaScore} />
        <ScorePill label="YOU" value={score.personalFit / 10} />
      </div>
      <div className="pick-evidence-row">
        <span><small>COUNTER DATA</small><b>{sourceText}</b></span>
        <span><small>ALLY FIT</small><b>{score.synergySource === 'empirical' ? `${(score.synergyProviders || []).join(' + ') || 'STRATZ'} · ${Number(score.synergyGames || 0).toLocaleString()} samples` : 'ROLE MODEL FALLBACK'}</b></span>
        <span><small>COVERAGE</small><b>{evidence.verified.length}/{Math.max(enemyCount, 0)} enemies</b></span>
        <span><small>PATCH</small><b>{patch?.id || '—'}</b></span>
      </div>
      <button onClick={() => onPick(hero, 'self')}>LOCK PICK{draftComplete ? ' · GAME PLAN READY' : ''} <span>→</span></button>
    </div>
  </article>;
}

function AdvisorSignals({ entry, enemyCount, patch }) {
  if (!entry) return null;
  const { score, personal, pairs = [] } = entry;
  const evidence = evidenceFor(entry, enemyCount);
  const verifiedPairs = evidence.verified;
  const signals = [
    ['ENEMY FIT', Math.max(0, Math.min(10, 5 + score.enemyScore / 2)), score.enemyScore >= 0 ? `+${score.enemyScore.toFixed(1)} counter edge` : `${score.enemyScore.toFixed(1)} counter pressure`],
    ['SYNERGY', Math.max(0, Math.min(10, 5 + score.synergyScore / 2)), score.synergySource === 'empirical'
      ? `${score.synergyScore >= 0 ? '+' : ''}${score.synergyScore.toFixed(1)} empirical ally fit · ${Number(score.synergyGames || 0).toLocaleString()} samples`
      : `${score.synergyScore >= 0 ? '+' : ''}${score.synergyScore.toFixed(1)} modeled ally fit · awaiting empirical pair data`],
    ['META', score.metaScore, score.metaGames
      ? `${score.metaProvider || 'STRATZ'} ${score.metaPosition ? score.metaPosition.replace('POSITION_', 'Pos ') : 'role'} · ${Number(score.metaGames).toLocaleString()} matches · patch ${patch?.id || 'current'}`
      : `${score.metaProvider || 'public'} overall baseline · patch ${patch?.id || 'current'}`],
  ];
  return <div className="advisor-signal-rail">
    <div className="advisor-signal-title">
      <span>WHY #1</span>
      <small>{personal?.games ? `${personal.games} personal games · experience shown, not required` : 'low experience · coach still shows the objective pick'}</small>
    </div>
    <div className="advisor-signal-bars">{signals.map(([label,value,note]) => <div key={label}><span><b>{label}</b><small>{note}</small></span><i><em style={{width:`${Math.max(3,Math.min(100,Number(value||0)*10))}%`}} /></i><strong>{Number(value||0).toFixed(1)}</strong></div>)}</div>
    {verifiedPairs.length > 0 && <div className="advisor-matchup-strip">
      <div>
        <b>ENEMY DRAFT EVIDENCE</b>
        <small>{evidence.label.toLowerCase()} confidence · {verifiedPairs.length}/{Math.max(enemyCount, 1)} covered · {evidence.games.toLocaleString()} pair samples</small>
      </div>
      <div className="advisor-matchup-chips">{verifiedPairs.slice(0,5).map(row => <span key={row.hero.id} title={`${row.hero.localized_name} · ${row.games.toLocaleString()} samples · ${row.provider || 'public provider'}`}>
        <img src={row.hero.portrait} alt=""/>
        <i>{row.hero.localized_name}</i>
        <strong className={row.score >= 0 ? 'positive' : 'negative'}>{row.score > 0 ? '+' : ''}{row.score.toFixed(1)}</strong>
      </span>)}</div>
    </div>}
    {enemyCount > 0 && verifiedPairs.length < enemyCount && <div className="evidence-gap-note">
      <b>PARTIAL EVIDENCE</b>
      <span>{enemyCount - verifiedPairs.length} entered enem{enemyCount - verifiedPairs.length === 1 ? 'y is' : 'ies are'} missing verified pair data. DotaSage keeps ranking, but confidence is reduced instead of inventing a matchup.</span>
    </div>}
    {(personal?.games || 0) < 8 && <div className="execution-risk"><b>COACH NOTE</b><span>#1 is the objective draft pick, but your personal sample is low. Treat it as a strong learning pick, not a promise that execution will be easy.</span></div>}
  </div>;
}

function CompactPick({ entry, rank, onPick, enemyCount }) {
  const { hero, score, personal } = entry;
  const evidence = evidenceFor(entry, enemyCount);
  return <button className="compact-pick" onClick={() => onPick(hero, 'self')}>
    <span className="compact-rank">{rank}</span><img src={hero.portrait} alt="" />
    <span className="compact-name"><strong>{hero.localized_name}</strong><small>{personal?.games ? `${personal.games} games` : 'new / low sample'}</small></span>
    <span className="compact-metric"><small>DRAFT</small><b>{score.draftFit.toFixed(1)}</b></span>
    <span className="compact-metric"><small>VS</small><b className={score.enemyScore >= 0 ? 'positive' : 'negative'}>{score.enemyScore > 0 ? '+' : ''}{score.enemyScore.toFixed(1)}</b></span>
    <span className="compact-metric syn-metric"><small>SYN</small><b className={score.synergyScore >= 0 ? 'positive' : 'negative'}>{score.synergyScore > 0 ? '+' : ''}{score.synergyScore.toFixed(1)}</b></span>
    <span className={`compact-confidence ${evidence.label.toLowerCase()}`} title={`${evidence.verified.length}/${Math.max(enemyCount, 1)} enemy matchups covered`}>{evidence.label}</span>
    <span className="compact-arrow">→</span>
  </button>;
}

export default function RecommendationPanel({
  recommendations,
  onPick,
  laneLabel,
  laneFilter,
  setLaneFilter,
  matrixLoading,
  advisorMode,
  setAdvisorMode,
  draftComplete = false,
  allyCount = 0,
  enemyCount = 0,
  playerSide = 'radiant',
  patch,
  providerStatus,
}) {
  const top = recommendations[0];
  const draftContext = enemyCount
    ? `${enemyCount}/5 enemies · ${allyCount}/5 allies`
    : `${allyCount}/5 allies · no enemy counters yet`;
  return <section className="recommend-panel glass-panel advisor-panel">
    <div className="recommend-head advisor-head">
      <div><div className="eyebrow">PICK ADVISOR · {laneLabel} · {playerSide.toUpperCase()}</div><h2>What should you pick?</h2></div>
      <div className="advisor-live-block">
        <div className={`matrix-indicator ${matrixLoading ? 'busy' : ''}`}><i />{matrixLoading ? 'Re-ranking…' : 'Live draft ranking'}</div>
        <small className="draft-context">USES {draftContext.toUpperCase()}</small>
      </div>
    </div>
    <div className="advisor-controls">
      <div className="advisor-modes">{advisorModes.map(([key,label]) => <button key={key} className={advisorMode === key ? 'active' : ''} onClick={() => setAdvisorMode(key)}>{label}</button>)}</div>
      <div className="position-picker compact-position-picker"><span>YOUR POSITION</span><div>{positionOptions.map(([key,label]) => <button key={key} className={laneFilter === key ? 'active' : ''} onClick={() => setLaneFilter(key)}>{label}</button>)}</div></div>
    </div>
    {top ? <>
      <div className="advisor-results">
        <PrimaryPick entry={top} onPick={onPick} mode={advisorMode} draftComplete={draftComplete} enemyCount={enemyCount} patch={patch} providerStatus={providerStatus} />
        <div className="compact-pick-list">{recommendations.slice(1,7).map((entry,i)=><CompactPick key={entry.hero.id} entry={entry} rank={i+2} onPick={onPick} enemyCount={enemyCount} />)}</div>
      </div>
      <AdvisorSignals entry={top} enemyCount={enemyCount} patch={patch} />
    </> : <div className="empty-state"><strong>No eligible heroes for this position.</strong><span>Try Flex or another role.</span></div>}
    <div className="recommend-foot v08-recommend-foot">
      <span><b>BEST PICK</b> counter-first: 82% aggregate counters + 8% worst-matchup risk · 7% ally fit · 3% meta</span>
      <span><b>CONFIDENCE</b> reflects matchup coverage/sample size; missing enemies lower the score instead of counting as neutral</span>
    </div>
  </section>;
}
