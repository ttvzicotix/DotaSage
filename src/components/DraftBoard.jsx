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
          {!beginnerMode && <>
            <button className={`online-live-toggle ${onlineLiveEnabled ? onlineLiveStatus.found ? 'active' : 'enabled' : ''}`} onClick={onToggleOnlineLive} title="Zero-download scan for your account in provider-listed live/watchable matches">
              <i /> {onlineLiveEnabled ? onlineLiveStatus.found ? 'ONLINE LIVE' : onlineLiveStatus.searching ? 'SCANNING…' : 'ONLINE SCAN' : 'ONLINE SCAN'}
            </button>
            <details className="draft-sync-advanced">
              <summary title="Optional desktop sync and advanced draft controls">SYNC ▾</summary>
              <div>
                <span><b>DESKTOP SYNC</b><small>Optional. Browser draft + timer work without it.</small></span>
                <button className={`live-draft-toggle local-only ${liveDraftEnabled ? liveDraftStatus.active ? 'active' : 'enabled' : ''}`} onClick={onToggleLiveDraft} title="Optional desktop Live Sync">
                  <i /> {liveDraftEnabled ? liveDraftStatus.active ? 'LOCAL LIVE' : liveDraftStatus.bridge ? 'LOCAL READY' : 'LOCAL WAIT' : 'CONNECT LOCAL'}
                </button>
              </div>
            </details>
            <button className={`ghost-button draft-link-button ${copyStatus ? 'status' : ''}`} onClick={onCopyLink} title="Copy a shareable link for this draft">{copyStatus || 'LINK'}</button>
            <button className="ghost-button" onClick={onSwapTeams} title="Swap your team and enemy team">⇄</button>
          </>}
          <button className="ghost-button" onClick={onClear}>Reset</button>
        </div>
      </div>
      {!beginnerMode && onlineLiveEnabled && <div className={`online-live-status ${onlineLiveStatus.found ? 'active' : onlineLiveStatus.error ? 'error' : 'searching'}`}>
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
      {!beginnerMode && liveDraftEnabled && <div className={`local-draft-status ${liveDraftStatus.active ? 'active' : liveDraftStatus.bridge ? 'ready' : 'waiting'}`}>
        <i />
        <span>{liveDraftStatus.active
          ? `Local draft detected${liveDraftStatus.gameState ? ` · ${liveDraftStatus.gameState}` : ''} · picks/bans sync automatically`
          : liveDraftStatus.bridge
            ? 'Optional local bridge connected · waiting for Dota draft data'
            : 'Optional desktop sync is off-line · browser-only draft/timer still work'}</span>
      </div>}
      <div className="team-columns map-side-columns">
        {playerSide === 'radiant' ? <>
          <TeamBlock label="RADIANT · YOUR TEAM" type="ally" side="Radiant" heroes={draft.allies} count={5} onRemove={onRemove} />
          <TeamBlock label="DIRE · ENEMY" type="enemy" side="Dire" heroes={draft.enemies} count={5} onRemove={onRemove} />
        </> : <>
          <TeamBlock label="RADIANT · ENEMY" type="enemy" side="Radiant" heroes={draft.enemies} count={5} onRemove={onRemove} />
          <TeamBlock label="DIRE · YOUR TEAM" type="ally" side="Dire" heroes={draft.allies} count={5} onRemove={onRemove} />
        </>}
      </div>
      {(!beginnerMode || draft.bans.length > 0) && <div className="ban-block compact-bans">
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
        </> : beginnerMode ? <p>Choose your hero with ★ PICK.</p> : <p>Lock your hero when ready. If both lineups fill first, DotaSage treats your fifth ally as your pick.</p>}
      </div>
    </section>
  );
}
