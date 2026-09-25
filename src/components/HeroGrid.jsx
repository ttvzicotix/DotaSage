import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import HeroCard from './HeroCard';
import { heroSearchScore } from '../data/heroAliases';

const attrs = [['allFilter', 'ALL'], ['str', 'STR'], ['agi', 'AGI'], ['int', 'INT'], ['all', 'UNI']];
const INITIAL_ROSTER = 48;
const ROSTER_STEP = 48;

const laneLabels = {
  all: 'ALL HEROES',
  safe: 'SAFE LANE',
  mid: 'MID',
  off: 'OFFLANE',
  support4: 'SUPPORT 4',
  support5: 'HARD SUPPORT 5',
  jungle: 'JUNGLE',
  roam: 'ROAM',
};
function QuickHero({ hero, state, onAction, playerSide, beginnerMode }) {
  const used = state && state !== 'available';
  const radiantAction = playerSide === 'radiant' ? 'ally' : 'enemy';
  const direAction = playerSide === 'dire' ? 'ally' : 'enemy';
  return <article className={`quick-hero-tile quick-result-card ${used ? `used ${state}` : ''}`}>
    <div className="quick-hero-main">
      <img src={hero.portrait} alt="" />
      <span className="quick-hero-name">
        <strong>{hero.localized_name}</strong>
        <small>{used ? (state === 'self' ? 'YOUR PICK' : state.toUpperCase()) : (hero.roles || []).slice(0, 2).join(' · ')}</small>
      </span>
    </div>
    {!used && <div className="quick-result-actions">
      <button className="radiant" onClick={() => onAction(hero, radiantAction)}>RADIANT</button>
      <button className="dire" onClick={() => onAction(hero, direAction)}>DIRE</button>
      <button className="pick" onClick={() => onAction(hero, 'self')}>★ MY PICK</button>
      {!beginnerMode && <button className="ban" onClick={() => onAction(hero, 'ban')}>BAN</button>}
    </div>}
  </article>;
}

export default function HeroGrid({ beginnerMode = true, allHeroes, roleHeroes, heroes, scores, stateForHero, onAction, query, setQuery, attr, setAttr, loadingLive, laneFilter, setLaneFilter, playerSide = 'radiant' }) {
  const [expanded, setExpanded] = useState(false);
  const [rosterScope, setRosterScope] = useState('all');
  const [renderLimit, setRenderLimit] = useState(INITIAL_ROSTER);
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef(null);
  const roleIds = useMemo(() => new Set(roleHeroes.map(hero => hero.id)), [roleHeroes]);

  const quickHeroes = useMemo(() => {
    const q = query.trim();
    const defaultPool = laneFilter === 'all' ? allHeroes : roleHeroes;
    const pool = q ? allHeroes : defaultPool;
    const rows = pool
      .filter(hero => q || stateForHero(hero.id) === 'available')
      .map(hero => ({
        hero,
        searchScore: q ? heroSearchScore(hero, q) : 0,
        recommendationScore: Number(scores?.get(hero.id)?.overall ?? scores?.get(hero.id)?.draftFit ?? 0),
      }))
      .filter(row => !q || row.searchScore >= 0)
      .sort((a, b) => q
        ? (b.searchScore - a.searchScore || b.recommendationScore - a.recommendationScore || a.hero.localized_name.localeCompare(b.hero.localized_name))
        : (b.recommendationScore - a.recommendationScore || a.hero.localized_name.localeCompare(b.hero.localized_name)));
    return rows.slice(0, q ? 8 : beginnerMode ? 12 : 16).map(row => row.hero);
  }, [allHeroes, roleHeroes, laneFilter, beginnerMode, query, stateForHero, scores]);

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
    const handleKey = event => {
      const tag = String(event.target?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || event.target?.isContentEditable;
      if (!typing && event.key === '/') {
        event.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (typing || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Escape') {
        setQuery('');
        setExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setQuery]);

  function runAction(hero, action) {
    onAction(hero, action);
    setQuery('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleSearchKeyDown(event) {
    if (event.key === 'Escape') {
      setQuery('');
      inputRef.current?.blur();
    }
  }

  return <section className={`hero-browser glass-panel ${expanded ? 'expanded' : 'collapsed'}`}>
    <div className="quick-add-row consolidated-quick-row">
      <div className="search-box hero-search">
        <span>⌕</span>
        <input
          ref={inputRef}
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search hero or alias…"
          autoComplete="off"
        />
        <kbd>/</kbd>
      </div>
      <button className="browse-toggle" onClick={() => setExpanded(true)}>ALL HEROES <b>⌄</b></button>
    </div>

    <div className="quick-hero-shelf persistent-hero-gallery">
      <div className="quick-shelf-label">
        <span>{query.trim() ? 'SEARCH RESULTS' : `${laneLabels[laneFilter] || 'HEROES'} · QUICK PICKS`}</span>
        <small>{query.trim()
          ? 'Choose Radiant, Dire, or My Pick directly on the hero card.'
          : 'Role-relevant heroes stay visible here. Search above or open All Heroes for the full roster.'}</small>
      </div>
      <div className="quick-hero-scroll">{quickHeroes.length
        ? quickHeroes.map(hero => <QuickHero key={hero.id} hero={hero} state={stateForHero(hero.id)} onAction={runAction} playerSide={playerSide} beginnerMode={beginnerMode} />)
        : <div className="quick-no-results">{query.trim() ? 'No hero or alias matches that search.' : 'No available heroes match this role.'}</div>}</div>
    </div>

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
