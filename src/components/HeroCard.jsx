function actionForMapSide(mapSide, playerSide) {
  return mapSide === playerSide ? 'ally' : 'enemy';
}

export default function HeroCard({ hero, score, state, onAction, pickEligible = true, playerSide = 'radiant' }) {
  const used = state && state !== 'available';
  const label = state === 'self' ? 'YOUR PICK' : state === 'ally' ? 'ALLY' : state === 'enemy' ? 'ENEMY' : state === 'ban' ? 'BANNED' : '';
  const mapAction = side => onAction(hero, actionForMapSide(side, playerSide));

  return <article className={`roster-card-v27 ${used ? `used ${state}` : ''}`}>
    <div className="roster-card-v27-art">
      <img src={hero.portrait} alt={hero.localized_name} loading="lazy" />
    </div>
    <div className="roster-card-v27-foot">
      <strong>{hero.localized_name}</strong>
      {!used && Number.isFinite(score?.enemyScore) && <span className={score.enemyScore >= 0 ? 'positive' : 'negative'}>
        {score.enemyScore > 0 ? '+' : ''}{score.enemyScore.toFixed(1)}
      </span>}
      {used
        ? <em>{label}</em>
        : <div className="roster-card-v27-actions">
            <button className="radiant" onClick={() => mapAction('radiant')}>RADIANT</button>
            <button className="dire" onClick={() => mapAction('dire')}>DIRE</button>
            <button className="pick" disabled={!pickEligible} onClick={() => pickEligible && onAction(hero, 'self')}>PICK</button>
            <button className="ban" onClick={() => onAction(hero, 'ban')}>BAN</button>
          </div>}
    </div>
  </article>;
}
