function DraftSlot({ hero, onRemove }) {
  return (
    <button className="draft-slot filled" onClick={() => onRemove(hero.id)} title="Remove hero">
      <img src={hero.portrait} alt="" />
      <span>{hero.localized_name}</span>
      <b>×</b>
    </button>
  );
}

function EmptySlot({ side, index }) {
  return <div className="draft-slot empty"><i>{index}</i><span>{side}</span></div>;
}

function TeamBlock({ label, type, side, heroes, count, onRemove }) {
  return (
    <div className={`team-block ${type}`}>
      <div className="team-block-head"><span>{label}</span><small>{heroes.length}/{count}</small></div>
      <div className="slot-stack">
        {heroes.map(hero => <DraftSlot key={hero.id} hero={hero} onRemove={onRemove} />)}
        {Array.from({ length: Math.max(0, count - heroes.length) }).map((_, i) => <EmptySlot key={i} side={side} index={heroes.length + i + 1} />)}
      </div>
    </div>
  );
}

export default function DraftBoard({ beginnerMode = true, draft, onRemove, onClear, onOpenGamePlan, onCopyLink, copyStatus = '', playerSide = 'radiant', onSideChange, onSwapTeams, onlineLiveEnabled = false, onlineLiveStatus = {}, onToggleOnlineLive, liveDraftEnabled = false, liveDraftStatus = {}, onToggleLiveDraft }) {
  const complete = draft.allies.length === 5 && draft.enemies.length === 5;
  return (
    <section className="draft-board glass-panel v06-draft-board">
      <div className="panel-head compact-head">
        <div><div className="eyebrow">LIVE DRAFT</div><h2>Lineups</h2></div>
        <div className="draft-head-actions">
          {!beginnerMode && <details className="draft-more-menu">
            <summary>MORE <b>⌄</b></summary>
            <div className="draft-more-popover">
              <button className={onlineLiveEnabled && onlineLiveStatus.found ? 'active' : ''} onClick={onToggleOnlineLive}>
                <span>ONLINE SCAN</span><small>{onlineLiveStatus.found ? 'Live match found' : onlineLiveStatus.searching ? 'Scanning…' : 'Browser-only live lookup'}</small>
              </button>
              <button className={liveDraftEnabled && liveDraftStatus.active ? 'active' : ''} onClick={onToggleLiveDraft}>
                <span>LOCAL SYNC</span><small>{liveDraftStatus.active ? 'Draft connected' : liveDraftStatus.bridge ? 'Bridge ready' : 'Optional desktop connection'}</small>
              </button>
              <button onClick={onCopyLink}><span>{copyStatus || 'COPY DRAFT LINK'}</span><small>Share this exact draft</small></button>
              <button onClick={onSwapTeams}><span>SWAP SIDES</span><small>Flip Radiant and Dire ownership</small></button>
            </div>
          </details>}
          <button className="ghost-button" onClick={onClear}>Reset</button>
        </div>
      </div>
      <div className="side-selector" aria-label="Choose your map side">
        <span>YOUR SIDE</span>
        <button className={playerSide === 'radiant' ? 'radiant active' : 'radiant'} onClick={() => onSideChange('radiant')}><i /> RADIANT</button>
        <button className={playerSide === 'dire' ? 'dire active' : 'dire'} onClick={() => onSideChange('dire')}><i /> DIRE</button>
      </div>
      <div className="team-columns map-side-columns">
        {playerSide === 'radiant' ? <>
          <TeamBlock label="RADIANT · YOUR TEAM" type="ally" side="Radiant" heroes={draft.allies} count={5} onRemove={onRemove} />
          <TeamBlock label="DIRE · ENEMY" type="enemy" side="Dire" heroes={draft.enemies} count={5} onRemove={onRemove} />
        </> : <>
          <TeamBlock label="RADIANT · ENEMY" type="enemy" side="Radiant" heroes={draft.enemies} count={5} onRemove={onRemove} />
          <TeamBlock label="DIRE · YOUR TEAM" type="ally" side="Dire" heroes={draft.allies} count={5} onRemove={onRemove} />
        </>}
      </div>
      {draft.bans.length > 0 && <div className="ban-block compact-bans">
        <div className="team-block-head"><span>Bans</span><small>{draft.bans.length} · free</small></div>
        <div className="ban-list">
          {draft.bans.length ? draft.bans.slice(-8).map(hero => <button key={hero.id} onClick={() => onRemove(hero.id)}>{hero.localized_name}<b>×</b></button>) : <span className="empty-inline">No bans</span>}
        </div>
      </div>}
      <div className={`locked-pick ${draft.self ? 'ready' : ''}`}>
        <span>YOUR HERO</span>
        {draft.self ? <>
          <div className="lock-hero"><img src={draft.self.portrait} alt="" /><strong>{draft.self.localized_name}</strong></div>
          <button className="primary-button" onClick={onOpenGamePlan}>{complete ? 'GAME PLAN' : 'PREVIEW GAME PLAN'} <b>→</b></button>
          {!beginnerMode && !complete && <small className="draft-readiness">Pick locked. Complete both lineups to enter Game Plan automatically.</small>}
        </> : <p>Choose your hero with Add to → My Pick.</p>}
      </div>
    </section>
  );
}
