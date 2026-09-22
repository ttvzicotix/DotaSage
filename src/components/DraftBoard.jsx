function DraftSlot({ hero, onRemove }) {
  return (
    <button className="draft-slot filled" onClick={() => onRemove(hero.id)} title="Remove hero">
      <img src={hero.portrait} alt="" />
      <span>{hero.localized_name}</span>
      <b>×</b>
    </button>
  );
}

function EmptySlot({ type, index }) {
  return <div className="draft-slot empty"><i>{index}</i><span>{type === 'ally' ? 'Ally' : 'Enemy'}</span></div>;
}

function TeamBlock({ label, type, heroes, count, onRemove }) {
  return (
    <div className={`team-block ${type}`}>
      <div className="team-block-head"><span>{label}</span><small>{heroes.length}/{count}</small></div>
      <div className="slot-stack">
        {heroes.map(hero => <DraftSlot key={hero.id} hero={hero} onRemove={onRemove} />)}
        {Array.from({ length: Math.max(0, count - heroes.length) }).map((_, i) => <EmptySlot key={i} type={type} index={heroes.length + i + 1} />)}
      </div>
    </div>
  );
}

export default function DraftBoard({ draft, onRemove, onClear, onOpenGamePlan, playerSide = 'radiant', onSideChange, onSwapTeams, onlineLiveEnabled = false, onlineLiveStatus = {}, onToggleOnlineLive, liveDraftEnabled = false, liveDraftStatus = {}, onToggleLiveDraft }) {
  const complete = draft.allies.length === 5 && draft.enemies.length === 5;
  return (
    <section className="draft-board glass-panel v06-draft-board">
      <div className="panel-head compact-head">
        <div><div className="eyebrow">LIVE DRAFT</div><h2>Lineups</h2></div>
        <div className="draft-head-actions">
          <button className={`online-live-toggle ${onlineLiveEnabled ? onlineLiveStatus.found ? 'active' : 'enabled' : ''}`} onClick={onToggleOnlineLive} title="Zero-download scan for your account in provider-listed live/watchable matches">
            <i /> {onlineLiveEnabled ? onlineLiveStatus.found ? 'ONLINE LIVE' : onlineLiveStatus.searching ? 'SCANNING…' : 'ONLINE SCAN' : 'ONLINE SCAN'}
          </button>
          <button className={`live-draft-toggle local-only ${liveDraftEnabled ? liveDraftStatus.active ? 'active' : 'enabled' : ''}`} onClick={onToggleLiveDraft} title="Optional desktop Live Sync — only needed for guaranteed local client data">
            <i /> {liveDraftEnabled ? liveDraftStatus.active ? 'LOCAL LIVE' : liveDraftStatus.bridge ? 'LOCAL READY' : 'LOCAL WAIT' : 'LOCAL'}
          </button>
          <button className="ghost-button" onClick={onSwapTeams} title="Swap your team and enemy team">⇄</button>
          <button className="ghost-button" onClick={onClear}>Reset</button>
        </div>
      </div>
      {onlineLiveEnabled && <div className={`online-live-status ${onlineLiveStatus.found ? 'active' : onlineLiveStatus.error ? 'error' : 'searching'}`}>
        <i />
        <span>{onlineLiveStatus.found
          ? `${onlineLiveStatus.provider || 'Online provider'} found match ${onlineLiveStatus.matchId || ''} · lineups/time update automatically when exposed`
          : onlineLiveStatus.error
            ? 'Online live provider is unavailable right now · manual draft still works'
            : `Zero-download live scan · ${onlineLiveStatus.scannedGames || 0} watchable games checked · manual entry remains available`}</span>
      </div>}
      <div className="side-selector" aria-label="Choose your map side">
        <span>YOUR SIDE</span>
        <button className={playerSide === 'radiant' ? 'radiant active' : 'radiant'} onClick={() => onSideChange('radiant')}><i /> RADIANT</button>
        <button className={playerSide === 'dire' ? 'dire active' : 'dire'} onClick={() => onSideChange('dire')}><i /> DIRE</button>
      </div>
      {liveDraftEnabled && <div className={`local-draft-status ${liveDraftStatus.active ? 'active' : liveDraftStatus.bridge ? 'ready' : 'waiting'}`}>
        <i />
        <span>{liveDraftStatus.active
          ? `Local draft detected${liveDraftStatus.gameState ? ` · ${liveDraftStatus.gameState}` : ''} · picks/bans sync automatically`
          : liveDraftStatus.bridge
            ? 'Optional local bridge connected · waiting for Dota draft data'
            : 'Optional desktop sync is off-line · browser-only draft/timer still work'}</span>
      </div>}
      <div className="team-columns map-side-columns">
        {playerSide === 'radiant' ? <>
          <TeamBlock label="RADIANT · YOUR TEAM" type="ally" heroes={draft.allies} count={5} onRemove={onRemove} />
          <TeamBlock label="DIRE · ENEMY" type="enemy" heroes={draft.enemies} count={5} onRemove={onRemove} />
        </> : <>
          <TeamBlock label="RADIANT · ENEMY" type="enemy" heroes={draft.enemies} count={5} onRemove={onRemove} />
          <TeamBlock label="DIRE · YOUR TEAM" type="ally" heroes={draft.allies} count={5} onRemove={onRemove} />
        </>}
      </div>
      <div className="ban-block compact-bans">
        <div className="team-block-head"><span>Bans</span><small>{draft.bans.length} · free</small></div>
        <div className="ban-list">
          {draft.bans.length ? draft.bans.slice(-8).map(hero => <button key={hero.id} onClick={() => onRemove(hero.id)}>{hero.localized_name}<b>×</b></button>) : <span className="empty-inline">No bans</span>}
        </div>
      </div>
      <div className={`locked-pick ${draft.self ? 'ready' : ''}`}>
        <span>YOUR HERO</span>
        {draft.self ? <>
          <div className="lock-hero"><img src={draft.self.portrait} alt="" /><strong>{draft.self.localized_name}</strong></div>
          <button className="primary-button" onClick={onOpenGamePlan}>{complete ? 'GAME PLAN' : 'PREVIEW GAME PLAN'} <b>→</b></button>
          {!complete && <small className="draft-readiness">Pick locked. Complete both lineups to enter Game Plan automatically.</small>}
        </> : <p>Lock your hero when ready. If both lineups fill first, DotaSage treats your fifth ally as your pick.</p>}
      </div>
    </section>
  );
}
