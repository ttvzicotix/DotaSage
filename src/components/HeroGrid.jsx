import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import HeroCard from './HeroCard';
import { heroSearchScore } from '../data/heroAliases';

const attrs = [['allFilter', 'ALL'], ['str', 'STR'], ['agi', 'AGI'], ['int', 'INT'], ['all', 'UNI']];
const INITIAL_ROSTER = 48;
const ROSTER_STEP = 48;
const positionFilters = [
  ['all', 'FLEX'], ['safe', 'POS 1'], ['mid', 'POS 2'], ['off', 'POS 3'],
  ['support4', 'POS 4'], ['support5', 'POS 5'], ['roam', 'ROAM'],
];
function quickTargetsForSide(playerSide) {
  const yourSide = playerSide === 'dire' ? 'DIRE' : 'RADIANT';
  const enemySide = playerSide === 'dire' ? 'RADIANT' : 'DIRE';
  return [
    ['ally', yourSide, '1'],
    ['enemy', enemySide, '2'],
    ['self', 'MY PICK', '3'],
    ['ban', 'BAN', '4'],
  ];
}

function QuickHero({ beginnerMode = true, hero, state, onAction, quickTarget, targets, playerSide }) {
  const used = state && state !== 'available';
  const targetLabel = targets.find(([key]) => key === quickTarget)?.[1] || (playerSide === 'dire' ? 'RADIANT' : 'DIRE');
  const radiantAction = playerSide === 'radiant' ? 'ally' : 'enemy';
  const direAction = playerSide === 'dire' ? 'ally' : 'enemy';
  return <article className={`quick-hero-tile ${used ? `used ${state}` : ''}`}>
    <button
      className="quick-hero-main"
      disabled={used}
      onClick={() => !used && onAction(hero, quickTarget)}
      title={used ? 'Already in the draft' : `Add ${hero.localized_name} as ${targetLabel}`}
    >
      <img src={hero.portrait} alt="" />
      <span className="quick-hero-name">
        <strong>{hero.localized_name}</strong>
        <small>{used ? (state === 'self' ? 'YOUR PICK' : state.toUpperCase()) : (hero.roles || []).slice(0, 2).join(' · ')}</small>
      </span>
      {!used && <b className="quick-target-hint">{targetLabel}</b>}
    </button>
    {!beginnerMode && !used && <div className="quick-hero-actions semantic-quick-actions">
      <button className="radiant" title="Add to Radiant" onClick={() => onAction(hero, radiantAction)}>RADIANT</button>
      <button className="dire" title="Add to Dire" onClick={() => onAction(hero, direAction)}>DIRE</button>
      <button className="pick" title={`Lock as your hero on ${playerSide.toUpperCase()}`} onClick={() => onAction(hero, 'self')}>★ PICK</button>
      <button className="ban" title="Ban hero" onClick={() => onAction(hero, 'ban')}>BAN</button>
    </div>}
  </article>;
}

export default function HeroGrid({ beginnerMode = true, allHeroes, roleHeroes, heroes, scores, stateForHero, onAction, query, setQuery, attr, setAttr, loadingLive, laneFilter, setLaneFilter, playerSide = 'radiant' }) {
  const [expanded, setExpanded] = useState(false);
  const [rosterScope, setRosterScope] = useState('all');
  const [renderLimit, setRenderLimit] = useState(INITIAL_ROSTER);
  const [quickTarget, setQuickTarget] = useState(() => {
    try { return sessionStorage.getItem('dotasage:quick-target') || 'enemy'; }
    catch { return 'enemy'; }
  });
  const deferredQuery = useDeferredValue(query);
  const quickTargets = useMemo(() => quickTargetsForSide(playerSide), [playerSide]);
  const inputRef = useRef(null);
  const roleIds = useMemo(() => new Set(roleHeroes.map(hero => hero.id)), [roleHeroes]);

  const quickHeroes = useMemo(() => {
    const q = query.trim();
    const rows = allHeroes
      .filter(hero => q || stateForHero(hero.id) === 'available')
      .map(hero => ({ hero, score: q ? heroSearchScore(hero, q) : 0 }))
      .filter(row => !q || row.score >= 0)
      .sort((a, b) => q ? (b.score - a.score || a.hero.localized_name.localeCompare(b.hero.localized_name)) : a.hero.localized_name.localeCompare(b.hero.localized_name));
    return rows.slice(0, 8).map(row => row.hero);
  }, [allHeroes, query, stateForHero]);

  const scopedRosterHeroes = useMemo(() => {
    if (rosterScope !== 'position' || laneFilter === 'all') return heroes;
    return heroes.filter(hero => roleIds.has(hero.id));
  }, [heroes, roleIds, rosterScope, laneFilter]);

  const visibleRosterHeroes = useMemo(() => {
    const searching = Boolean(deferredQuery.trim());
    return scopedRosterHeroes.slice(0, searching ? Math.max(renderLimit, 72) : renderLimit);
  }, [scopedRosterHeroes, deferredQuery, renderLimit]);

  useEffect(() => { if (expanded) setRenderLimit(INITIAL_ROSTER); }, [expanded, rosterScope, laneFilter]);

  useEffect(() => {
    try { sessionStorage.setItem('dotasage:quick-target', quickTarget); } catch {}
  }, [quickTarget]);

  useEffect(() => {
    const handleKey = event => {
      const tag = String(event.target?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || event.target?.isContentEditable;
      if (!typing && event.key === '/') {
        event.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (typing || event.altKey || event.ctrlKey || event.metaKey) return;
      const byKey = beginnerMode
        ? { '1': 'ally', '2': 'enemy', '3': 'self' }
        : { '1': 'ally', '2': 'enemy', '3': 'self', '4': 'ban' };
      if (byKey[event.key]) {
        event.preventDefault();
        setQuickTarget(byKey[event.key]);
      }
      if (event.key === 'Escape') {
        setQuery('');
        setExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setQuery, beginnerMode]);

  function runAction(hero, action) {
    onAction(hero, action);
    setQuery('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleSearchKeyDown(event) {
    if (event.key === 'Enter' && query.trim() && quickHeroes[0] && stateForHero(quickHeroes[0].id) === 'available') {
      event.preventDefault();
      runAction(quickHeroes[0], quickTarget);
    }
    if (event.key === 'Escape') {
      setQuery('');
      inputRef.current?.blur();
    }
  }

  return <section className={`hero-browser glass-panel ${expanded ? 'expanded' : 'collapsed'}`}>
    <div className={`quick-add-row v08-quick-row v021-quick-row ${beginnerMode ? 'simple-quick-row' : ''}`}>
      {!beginnerMode && <div className="quick-copy">
        <div className="eyebrow">QUICK DRAFT · ALL HEROES</div>
        <strong>Search, press Enter, keep drafting. No mouse precision required.</strong>
      </div>}
      <div className="hero-search-wrap">
        <div className="search-box hero-search">
          <span>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Hero or alias · wk · bm · ck · ss…"
            autoComplete="off"
          />
          <kbd>/</kbd>
        </div>
        {!beginnerMode && <div className="quick-search-scope always-all" aria-label="Quick Draft behavior">
          <span><b>ENTER</b> adds the first match as your selected target · <b>1–4</b> switches target</span>
        </div>}
      </div>
      <button className="browse-toggle" onClick={() => setExpanded(true)}>BROWSE ROSTER <b>⌄</b></button>
    </div>

    <div className={`quick-target-picker ${beginnerMode ? 'simple-target-picker' : ''}`} aria-label="Quick add target">
      {!beginnerMode && <span><b>ADD SEARCH RESULTS TO</b><small>1 = {quickTargets[0][1]} · 2 = {quickTargets[1][1]} · 3 = your pick · 4 = ban</small></span>}
      <div>{quickTargets.filter(([key]) => !beginnerMode || key !== 'ban').map(([key,label,shortcut]) => <button key={key} className={quickTarget === key ? `active ${key}` : key} onClick={() => setQuickTarget(key)}>
        {!beginnerMode && <kbd>{shortcut}</kbd>}{label}
      </button>)}</div>
      {!beginnerMode && <em>{quickTarget === 'ally'
        ? `Adds to ${quickTargets[0][1]} · your selected side`
        : quickTarget === 'enemy'
          ? `Adds to ${quickTargets[1][1]} · opposing side`
          : quickTarget === 'self'
            ? 'Locks your hero and adds it to your team'
            : 'Adds to the ban list'}</em>}
    </div>

    <div className={`quick-position-picker ${beginnerMode ? 'simple-position-picker' : ''}`} aria-label="Pick Advisor role filter">
      <span><b>ROLE</b>{!beginnerMode && <small>Limits recommendations to role-relevant heroes</small>}</span>
      {beginnerMode
        ? <select className="simple-role-select" value={laneFilter} onChange={event => setLaneFilter?.(event.target.value)} aria-label="Choose your role">
            {positionFilters.filter(([key]) => key !== 'roam').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        : <div>{positionFilters.map(([key, label]) => <button key={key} className={laneFilter === key ? 'active' : ''} onClick={() => setLaneFilter?.(key)}>{label}</button>)}</div>}
    </div>

    {(!beginnerMode || query.trim()) && <div className="quick-hero-shelf">
      <div className="quick-shelf-label">
        <span>{query ? 'MATCHES' : 'QUICK HEROES'}</span>
        <small>{query ? `Enter adds #1 to ${quickTargets.find(([key]) => key === quickTarget)?.[1] || 'target'}` : 'click a tile to use the active Radiant/Dire target · hover for overrides'}</small>
      </div>
      <div className="quick-hero-scroll">{quickHeroes.length
        ? quickHeroes.map(hero => <QuickHero beginnerMode={beginnerMode} key={hero.id} hero={hero} state={stateForHero(hero.id)} onAction={runAction} quickTarget={quickTarget} targets={quickTargets} playerSide={playerSide} />)
        : <div className="quick-no-results">No hero or alias matches that search.</div>}</div>
    </div>}

    {expanded && <div className="roster-screen">
      <div className="roster-screen-inner">
        <div className="roster-screen-head"><div><div className="eyebrow">HERO ROSTER</div><h2>Browse heroes</h2><p>Starts with a lighter render for faster opening. Load more only when you need it.</p></div><button className="roster-close" onClick={() => setExpanded(false)}>DONE ×</button></div>
        <div className="roster-screen-tools v014-roster-tools">
          <div className="search-box roster-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search roster or alias…" /></div>
          <div className="attr-filters">{attrs.map(([key, label]) => <button key={key} className={attr === key ? 'active' : ''} onClick={() => setAttr(key)}>{label}</button>)}</div>
          <div className="roster-scope-controls"><button className={rosterScope === 'all' ? 'active' : ''} onClick={() => setRosterScope('all')}>ALL HEROES</button><button className={rosterScope === 'position' ? 'active' : ''} onClick={() => setRosterScope('position')} disabled={laneFilter === 'all'}>ADVISOR POSITION</button></div>
        </div>
        <div className="roster-full-grid">
          {visibleRosterHeroes.map(hero => <HeroCard key={hero.id || hero.localized_name} hero={hero} score={scores.get(hero.id)} state={stateForHero(hero.id)} onAction={runAction} pickEligible playerSide={playerSide} />)}
          {visibleRosterHeroes.length < scopedRosterHeroes.length && <div className="roster-progress"><span>Showing {visibleRosterHeroes.length} of {scopedRosterHeroes.length} heroes to keep this panel snappy.</span><button onClick={() => setRenderLimit(current => current + ROSTER_STEP)}>SHOW MORE</button></div>}
        </div>
      </div>
    </div>}
  </section>;
}
