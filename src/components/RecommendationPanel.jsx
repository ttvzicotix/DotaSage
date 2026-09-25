const positions = [
  ['all', 'FLEX', 'Any position'],
  ['safe', '1', 'Carry · Safe lane'],
  ['mid', '2', 'Mid'],
  ['off', '3', 'Offlane'],
  ['support4', '4', 'Support'],
  ['support5', '5', 'Hard support'],
];

export const positionOptions = positions.map(([key, short, title]) => [key, title]);
export const advisorModes = [
  ['best', 'Best pick'],
  ['counter', 'Counter'],
  ['meta', 'Meta'],
  ['personal', 'For you'],
  ['learn', 'Learn'],
];

function evidenceFor(entry, enemyCount = 0) {
  const pairs = Array.isArray(entry?.pairs) ? entry.pairs : [];
  const verified = pairs.filter(row => Number(row?.games || 0) > 0);
  const games = verified.reduce((sum, row) => sum + Number(row.games || 0), 0);
  const avgConfidence = verified.length
    ? verified.reduce((sum, row) => sum + Number(row.confidence || 0), 0) / verified.length
    : 0;
  const expected = Math.max(1, enemyCount);
  const coverage = Math.min(1, verified.length / expected);

  let label = 'LOW';
  if (coverage >= 0.8 && avgConfidence >= 0.8 && games >= 1500) label = 'HIGH';
  else if (coverage >= 0.5 && avgConfidence >= 0.55 && games >= 400) label = 'MED';

  return { verified, games, coverage, label };
}

function ForecastStrip({ forecast = [], loading = false }) {
  if (!forecast.length && !loading) return null;
  return <div className="enemy-forecast-v27">
    <span>LIKELY NEXT</span>
    <div>
      {forecast.slice(0, 3).map(row => <div
        className="enemy-forecast-v27-card"
        key={row.hero.id}
        title="Heuristic forecast from role gaps, draft fit, popularity/meta and available matchup evidence."
      >
        <img src={row.hero.portrait} alt="" />
        <b>{row.hero.localized_name}</b>
      </div>)}
      {loading && <i className="enemy-forecast-v27-loading" title="Refreshing forecast" />}
    </div>
  </div>;
}

function PrimaryPick({ entry, onPick, enemyCount, refreshing = false }) {
  const { hero, score } = entry;
  const evidence = evidenceFor(entry, enemyCount);

  return <article className="pick-card-v27">
    <div className="pick-card-v27-art">
      <img src={hero.portrait} alt="" />
    </div>
    <div className="pick-card-v27-body">
      <div className="pick-card-v27-title">
        <strong>{hero.localized_name}</strong>
        <b>{score.draftFit.toFixed(1)}</b>
      </div>
      {enemyCount > 0 && <div className="pick-card-v27-chips">
        <span className={score.enemyScore >= 0 ? 'positive' : 'negative'}>VS {score.enemyScore > 0 ? '+' : ''}{score.enemyScore.toFixed(1)}</span>
        <span>{evidence.label} CONF</span>
      </div>}
      <button disabled={refreshing} onClick={() => onPick(hero, 'self')}>
        {refreshing ? 'UPDATING…' : 'PICK'}
      </button>
    </div>
  </article>;
}

function AlternatePick({ entry, onPick, refreshing = false, enemyCount = 0 }) {
  const { hero, score } = entry;
  return <button disabled={refreshing} className="alt-pick-v27" onClick={() => onPick(hero, 'self')}>
    <img src={hero.portrait} alt="" />
    <span>{hero.localized_name}</span>
    {enemyCount > 0 && <b className={score.enemyScore >= 0 ? 'positive' : 'negative'}>{score.enemyScore > 0 ? '+' : ''}{score.enemyScore.toFixed(1)}</b>}
  </button>;
}

function AdvancedDetails({ entry, enemyCount, advisorMode, setAdvisorMode }) {
  if (!entry) return null;
  const { score } = entry;
  const evidence = evidenceFor(entry, enemyCount);

  return <details className="advisor-details-v27">
    <summary>DETAILS <span>⌄</span></summary>
    <div className="advisor-details-v27-body">
      <label>
        <span>RANKING</span>
        <select value={advisorMode} onChange={event => setAdvisorMode(event.target.value)}>
          {advisorModes.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <div className="advisor-details-v27-metrics">
        <span><small>COUNTER</small><b>{score.enemyScore > 0 ? '+' : ''}{score.enemyScore.toFixed(1)}</b></span>
        <span><small>SYNERGY</small><b>{score.synergyScore > 0 ? '+' : ''}{score.synergyScore.toFixed(1)}</b></span>
        <span><small>META</small><b>{score.metaScore.toFixed(1)}</b></span>
        <span><small>FUTURE</small><b>{score.futureCounterEvidence ? `${score.futureCounterScore > 0 ? '+' : ''}${score.futureCounterScore.toFixed(1)}` : '—'}</b></span>
        <span><small>EVIDENCE</small><b>{evidence.verified.length}/{Math.max(enemyCount, 0)}</b></span>
      </div>
    </div>
  </details>;
}

export default function RecommendationPanel({
  beginnerMode = true,
  recommendations,
  enemyForecast = [],
  forecastLoading = false,
  onPick,
  laneFilter,
  setLaneFilter,
  matrixLoading,
  advisorMode,
  setAdvisorMode,
  enemyCount = 0,
}) {
  const top = recommendations[0];

  return <section className={`recommend-panel-v27 ${matrixLoading ? 'is-refreshing' : ''}`} aria-busy={matrixLoading ? 'true' : 'false'}>
    <div className="advisor-bar-v27">
      <strong>PICK</strong>
      <div className="role-tabs-v27" aria-label="Choose role">
        {positions.map(([key, short, title]) => <button
          key={key}
          className={laneFilter === key ? 'active' : ''}
          onClick={() => setLaneFilter(key)}
          title={title}
        >{short}</button>)}
      </div>
      {matrixLoading && <i className="advisor-refresh-v27" title="Refreshing matchup data" />}
    </div>

    <ForecastStrip forecast={enemyForecast} loading={forecastLoading} />

    {top ? <>
      <PrimaryPick entry={top} onPick={onPick} enemyCount={enemyCount} refreshing={matrixLoading} />
      <div className="alt-picks-v27">
        {recommendations.slice(1, 5).map(entry => <AlternatePick
          key={entry.hero.id}
          entry={entry}
          onPick={onPick}
          refreshing={matrixLoading}
          enemyCount={enemyCount}
        />)}
      </div>
      {!beginnerMode && <AdvancedDetails
        entry={top}
        enemyCount={enemyCount}
        advisorMode={advisorMode}
        setAdvisorMode={setAdvisorMode}
      />}
    </> : <div className="advisor-empty-v27">No hero fits this role yet.</div>}
  </section>;
}
