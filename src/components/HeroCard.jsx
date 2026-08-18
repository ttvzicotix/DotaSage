import ScorePill from './ScorePill';

function actionForMapSide(mapSide, playerSide) {
  return mapSide === playerSide ? 'ally' : 'enemy';
}

export default function HeroCard({ hero, score, state, onAction, pickEligible = true, playerSide = 'radiant' }) {
  const used = state && state !== 'available';
  const label = state === 'self' ? 'YOUR PICK' : state === 'ally' ? 'ALLY' : state === 'enemy' ? 'ENEMY' : state === 'ban' ? 'BANNED' : '';
  const mapAction = side => onAction(hero, actionForMapSide(side, playerSide));
  return (
    <article className={`hero-card attr-${hero.primary_attr} ${used ? `used ${state}` : ''}`}>
      <div className="portrait-wrap">
        <img src={hero.portrait} alt={hero.localized_name} loading="lazy" />
        <div className="hero-shade" />
        {label && <span className="used-label">{label}</span>}
        {!used && <div className="hero-actions map-side-actions">
          <button className="action radiant" title="Add to Radiant" onClick={() => mapAction('radiant')}>+ RADIANT</button>
          <button className="action dire" title="Add to Dire" onClick={() => mapAction('dire')}>+ DIRE</button>
          <button className="action pick" disabled={!pickEligible} title={pickEligible ? `Lock as your hero on ${playerSide.toUpperCase()}` : 'Outside your selected position'} onClick={() => pickEligible && onAction(hero, 'self')}>★ MY PICK</button>
          <button className="action ban" onClick={() => onAction(hero, 'ban')}>BAN</button>
        </div>}
      </div>
      <div className="hero-card-body">
        <div className="hero-title-row"><h3>{hero.localized_name}</h3><span className={`attr-dot ${hero.primary_attr}`} /></div>
        <div className="hero-role-line">{(hero.roles || []).slice(0, 3).join(' · ') || 'Role data loading'}</div>
        <div className="mini-scores"><ScorePill label="VS" value={score?.enemyScore} signed /><ScorePill label="REC" value={score?.overall} /></div>
      </div>
    </article>
  );
}
