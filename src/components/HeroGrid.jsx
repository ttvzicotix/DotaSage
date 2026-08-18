import { useMemo, useRef, useState } from 'react';
import HeroCard from './HeroCard';
import { heroSearchScore } from '../data/heroAliases';

const attrs = [['allFilter', 'ALL'], ['str', 'STR'], ['agi', 'AGI'], ['int', 'INT'], ['all', 'UNI']];

function actionForMapSide(mapSide, playerSide) { return mapSide === playerSide ? 'ally' : 'enemy'; }

function QuickHero({ hero, state, onAction, playerSide }) {
  const used = state && state !== 'available';
  return <article className={`quick-hero-tile ${used ? `used ${state}` : ''}`}>
    <img src={hero.portrait} alt="" />
    <div className="quick-hero-name"><strong>{hero.localized_name}</strong><small>{used ? (state === 'self' ? 'YOUR PICK' : state.toUpperCase()) : (hero.roles || []).slice(0,2).join(' · ')}</small></div>
    {!used && <div className="quick-hero-actions map-side-quick-actions">
      <button className="radiant" title="Add to Radiant" onClick={() => onAction(hero, actionForMapSide('radiant', playerSide))}>R</button>
      <button className="pick" title={`Lock as your hero on ${playerSide.toUpperCase()}`} onClick={() => onAction(hero, 'self')}>★</button>
      <button className="ban" title="Ban hero" onClick={() => onAction(hero, 'ban')}>B</button>
      <button className="dire" title="Add to Dire" onClick={() => onAction(hero, actionForMapSide('dire', playerSide))}>D</button>
    </div>}
  </article>;
}

export default function HeroGrid({ allHeroes, roleHeroes, heroes, scores, stateForHero, onAction, query, setQuery, attr, setAttr, loadingLive, laneFilter, playerSide = 'radiant' }) {
  const [expanded, setExpanded] = useState(false);
  const [rosterScope, setRosterScope] = useState('all');
  const inputRef = useRef(null);
  const roleIds = useMemo(() => new Set(roleHeroes.map(h => h.id)), [roleHeroes]);

  // Quick Draft is deliberately role-agnostic. Role belongs to Pick Advisor only.
  const quickHeroes = useMemo(() => {
    const q = query.trim();
    const rows = allHeroes
      .filter(hero => q || stateForHero(hero.id) === 'available')
      .map(hero => ({ hero, score: q ? heroSearchScore(hero, q) : 0 }))
      .filter(row => !q || row.score >= 0)
      .sort((a,b) => q ? (b.score - a.score || a.hero.localized_name.localeCompare(b.hero.localized_name)) : a.hero.localized_name.localeCompare(b.hero.localized_name));
    return rows.slice(0, 8).map(row => row.hero);
  }, [allHeroes, query, stateForHero]);

  const scopedRosterHeroes = useMemo(() => {
    if (rosterScope !== 'position' || laneFilter === 'all') return heroes;
    return heroes.filter(hero => roleIds.has(hero.id));
  }, [heroes, roleIds, rosterScope, laneFilter]);

  function runAction(hero, action) {
    onAction(hero, action);
    setQuery('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <section className={`hero-browser glass-panel ${expanded ? 'expanded' : 'collapsed'}`}>
      <div className="quick-add-row v08-quick-row">
        <div className="quick-copy"><div className="eyebrow">QUICK DRAFT · ALL HEROES</div><strong>Enter the draft. Role filtering lives in Pick Advisor.</strong></div>
        <div className="hero-search-wrap">
          <div className="search-box hero-search"><span>⌕</span><input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Hero or alias · wk · bm · ck · ss…" autoComplete="off" /></div>
          <div className="quick-search-scope always-all" aria-label="Quick Draft behavior">
            <span><b>{allHeroes.length} HEROES</b> · R Radiant · D Dire · ★ your hero · B ban · search resets after every add</span>
          </div>
        </div>
        <button className="browse-toggle" onClick={() => setExpanded(true)}>BROWSE ROSTER <b>⌄</b></button>
      </div>

      <div className="quick-hero-shelf">
        <div className="quick-shelf-label"><span>{query ? 'MATCHES' : 'QUICK HEROES'}</span><small>{query ? 'aliases can return multiple heroes · R / D / ★ / B' : 'first 8 available alphabetically · no role lock'}</small></div>
        <div className="quick-hero-scroll">
          {quickHeroes.length ? quickHeroes.map(hero => <QuickHero key={hero.id} hero={hero} state={stateForHero(hero.id)} onAction={runAction} playerSide={playerSide} />) : <div className="quick-no-results">No hero or alias matches that search.</div>}
        </div>
      </div>

      {expanded && <div className="roster-screen">
        <div className="roster-screen-inner">
          <div className="roster-screen-head">
            <div><div className="eyebrow">HERO ROSTER</div><h2>Browse heroes</h2><p>Full roster by default. The optional position scope follows the role selected in Pick Advisor.</p></div>
            <button className="roster-close" onClick={() => setExpanded(false)}>DONE ×</button>
          </div>
          <div className="roster-screen-tools v014-roster-tools">
            <div className="search-box roster-search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search roster or alias…" /></div>
            <div className="attr-filters">{attrs.map(([key,label]) => <button key={key} className={attr===key?'active':''} onClick={()=>setAttr(key)}>{label}</button>)}</div>
            <div className="roster-scope-controls"><button className={rosterScope === 'all' ? 'active' : ''} onClick={() => setRosterScope('all')}>ALL HEROES</button><button className={rosterScope === 'position' ? 'active' : ''} onClick={() => setRosterScope('position')} disabled={laneFilter === 'all'}>ADVISOR POSITION</button></div>
          </div>
          <div className="roster-full-grid">{scopedRosterHeroes.map(hero => <HeroCard key={hero.id || hero.localized_name} hero={hero} score={scores.get(hero.id)} state={stateForHero(hero.id)} onAction={runAction} pickEligible playerSide={playerSide} />)}</div>
        </div>
      </div>}
    </section>
  );
}
