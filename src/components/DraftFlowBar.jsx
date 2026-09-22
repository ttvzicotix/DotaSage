const roleShort = {
  all: 'Flex',
  safe: 'Pos 1',
  mid: 'Pos 2',
  off: 'Pos 3',
  support4: 'Pos 4',
  support5: 'Pos 5',
  jungle: 'Jungle',
  roam: 'Roam',
};

function Step({ label, value, state = 'pending' }) {
  return <div className={`draft-flow-step ${state}`}>
    <i />
    <span><small>{label}</small><strong>{value}</strong></span>
  </div>;
}

export default function DraftFlowBar({
  connected,
  playerSide,
  laneFilter,
  allyCount,
  enemyCount,
  hasPick,
  patch,
  onlineLiveStatus,
  providerStatus,
}) {
  const lineupCount = allyCount + enemyCount;
  const progress = [connected, Boolean(playerSide), laneFilter !== 'all', lineupCount > 0, hasPick].filter(Boolean).length;
  const next = !connected
    ? 'Optional: connect your Dota ID for personal history'
    : laneFilter === 'all'
      ? 'Choose your role to narrow recommendations'
      : enemyCount === 0
        ? 'Add enemies first for counter evidence'
        : !hasPick
          ? 'Lock your hero when the recommendation looks right'
          : lineupCount < 10
            ? 'Keep filling the draft or preview Game Plan now'
            : 'Draft complete · Game Plan ready';

  return <section className="draft-flow-bar" aria-label="Draft progress">
    <div className="draft-flow-main">
      <div className="draft-flow-progress">
        <span>DRAFT FLOW</span>
        <b>{progress}/5</b>
      </div>
      <Step label="ACCOUNT" value={connected ? 'Connected' : 'Guest'} state={connected ? 'done' : 'optional'} />
      <Step label="SIDE" value={String(playerSide || '—').toUpperCase()} state={playerSide ? 'done' : 'pending'} />
      <Step label="ROLE" value={roleShort[laneFilter] || 'Flex'} state={laneFilter !== 'all' ? 'done' : 'active'} />
      <Step label="LINEUPS" value={`${allyCount}/5 · ${enemyCount}/5`} state={lineupCount ? (lineupCount === 10 ? 'done' : 'active') : 'pending'} />
      <Step label="YOUR PICK" value={hasPick ? 'Locked' : 'Open'} state={hasPick ? 'done' : enemyCount ? 'active' : 'pending'} />
    </div>
    <div className="draft-flow-meta">
      <span className="draft-flow-next"><b>NEXT</b>{next}</span>
      <span className="draft-flow-chip patch">PATCH {patch?.id || '—'}</span>
      <span className={`draft-flow-chip ${providerStatus?.stratzConfigured ? 'ready' : 'fallback'}`}>
        {providerStatus?.stratzConfigured ? 'STRATZ + OPENDOTA' : 'OPENDOTA · STRATZ READY'}
      </span>
      {onlineLiveStatus?.found && <span className="draft-flow-chip live">ONLINE LIVE</span>}
    </div>
  </section>;
}
