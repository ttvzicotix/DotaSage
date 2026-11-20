import { useState } from 'react';
import HeroPortrait from './HeroPortrait';
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
  ['synergy', 'Team fit'],
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
        <HeroPortrait hero={row.hero} />
        <b>{row.hero.localized_name}</b>
      </div>)}
      {loading && <i className="enemy-forecast-v27-loading" title="Refreshing forecast" />}
    </div>
  </div>;
}

function PickCard({ entry, onPick, enemyCount, refreshing, featured = false }) {
  const { hero, score } = entry;
  const evidence = evidenceFor(entry, enemyCount);
  const signed = value => `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
  return <article className={`sage-pick ${featured ? 'sage-pick--featured' : ''}`}>
    <div className="sage-pick-portrait"><HeroPortrait hero={hero} /></div>
    <div className="sage-pick-content">
      <div className="sage-pick-heading"><div><small>{featured ? 'LEADING PICK' : entry.rankingReason || 'ALTERNATIVE'}</small><h3>{hero.localized_name}</h3></div><div className="sage-pick-fit"><b>{score.draftFit.toFixed(1)}</b><small>FIT / 10</small></div></div>
      <p className="sage-pick-roles">{(hero.roles || []).slice(0, 3).join(' · ')}</p>
      <div className="sage-pick-metrics">
        <span>Counter <b>{enemyCount && evidence.verified.length ? signed(score.enemyScore) : '—'}</b></span>
        <span title={score.synergySource === 'empirical' ? 'Same-team samples' : 'Modeled role complement'}>Team <b>{signed(score.synergyScore)}</b><small>{score.synergySource === 'empirical' ? 'sampled' : 'modeled'}</small></span>
      </div>
      <button className="sage-pick-action" disabled={refreshing} onClick={() => onPick(hero, 'self')} aria-label={`Pick ${hero.localized_name}`}>{refreshing ? 'Updating…' : `Pick ${hero.localized_name}`}</button>
    </div>
  </article>;
}
function PrimaryPick(props) { return <PickCard {...props} featured />; }
function AlternatePick(props) { return <PickCard {...props} />; }

function AdvancedDetails({ entry, enemyCount }) {
  if (!entry) return null;
  const { score } = entry;
  const evidence = evidenceFor(entry, enemyCount);

  return <details className="advisor-details-v27">
    <summary>DETAILS <span>⌄</span></summary>
    <div className="advisor-details-v27-body">
      <div className="advisor-details-v27-metrics">
        <span><small>COUNTER</small><b>{score.enemyScore > 0 ? '+' : ''}{score.enemyScore.toFixed(1)}</b></span>
        <span><small>SYNERGY ({score.synergySource === "empirical" ? "SAMPLED" : "MODELED"})</small><b>{score.synergyScore > 0 ? '+' : ''}{score.synergyScore.toFixed(1)}</b></span>
        <span><small>META</small><b>{score.metaScore.toFixed(1)}</b></span>
        <span><small>FUTURE</small><b>{score.futureCounterEvidence ? `${score.futureCounterScore > 0 ? '+' : ''}${score.futureCounterScore.toFixed(1)}` : '—'}</b></span>
        <span><small>EVIDENCE</small><b>{evidence.verified.length}/{Math.max(enemyCount, 0)}</b></span>
      </div>
    </div>
  </details>;
}

export default function RecommendationPanel({
  recommendations,
  onRefreshAlternatives,
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
  const [visibleCount, setVisibleCount] = useState(18);
  const top = recommendations[0];

  return <section className={`recommend-panel-v27 sage-advisor ${matrixLoading ? 'is-refreshing' : ''}`} aria-busy={matrixLoading ? 'true' : 'false'}>
    <div className="advisor-bar-v27">
      <strong>FIND YOUR PICK</strong>
      <div className="advisor-controls-v27">
        <div className="role-tabs-v27" role="group" aria-label="Choose role">
          {positions.map(([key, short, title]) => <button
            key={key}
            className={laneFilter === key ? 'active' : ''}
            aria-pressed={laneFilter === key}
            onClick={() => setLaneFilter(key)}
            title={title}
          >{short}</button>)}
        </div>
        <div className="advisor-mode-tabs-v27" role="group" aria-label="Choose recommendation strategy">
          {advisorModes.map(([key, label]) => <button
            key={key}
            className={advisorMode === key ? 'active' : ''}
            aria-pressed={advisorMode === key}
            onClick={() => setAdvisorMode(key)}
            title={label}
          >{label}</button>)}
        </div>
      </div>
      {matrixLoading && <i className="advisor-refresh-v27" title="Refreshing matchup data" />}
    </div>

    <ForecastStrip forecast={enemyForecast} loading={forecastLoading} />

    {top ? <>
      <PrimaryPick entry={top} onPick={onPick} enemyCount={enemyCount} refreshing={matrixLoading} />
      <p className="suggestion-count">Showing {Math.min(visibleCount, recommendations.length)} of {recommendations.length} eligible heroes · strongest pick first</p>
      {advisorMode === 'best' && <div className="sage-variety-bar"><span>Close alternatives vary; the leading pick stays strongest.</span><button disabled={matrixLoading} onClick={onRefreshAlternatives}>Fresh alternatives</button></div>}
      <div className="sage-picks-grid">
        {recommendations.slice(1, visibleCount).map(entry => <AlternatePick
          key={entry.hero.id}
          entry={entry}
          onPick={onPick}
          refreshing={matrixLoading}
          enemyCount={enemyCount}
        />)}
      </div>
      {recommendations.length > visibleCount && <button className="show-more-picks" onClick={() => setVisibleCount(count => count + 18)}>Show 18 more suggestions</button>}
      {visibleCount > 18 && <button className="show-more-picks" onClick={() => setVisibleCount(18)}>Show fewer</button>}
      {<AdvancedDetails
        entry={top}
        enemyCount={enemyCount}
      />}
    </> : <div className="advisor-empty-v27">No hero fits this role yet.</div>}
  </section>;
}
