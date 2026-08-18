import { useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';
import { CURRENT_PATCH } from './data/currentPatch';
import { DEFAULT_PROFILE } from './data/defaultProfile';
import { fetchHeroes, fetchHeroMatchups, fetchHeroStats, fetchPlayer, fetchPlayerHeroes, fetchPlayerWinLoss, fetchRecentMatches, fetchPlayerMatchHistory, fetchHeroDurations, fetchHeroItemPopularity, fetchItems, portraitUrl } from './services/openDota';
import { buildPersonalScores } from './engine/playerModel';
import { aggregateEnemyScore, compositionFit, compositionSynergyScore, draftFitScore, heroBaseWinRate, overallRecommendation, pairCounterScore } from './engine/scoring';
import PlayerProfile from './components/PlayerProfile';
import DraftBoard from './components/DraftBoard';
import HeroGrid from './components/HeroGrid';
import RecommendationPanel from './components/RecommendationPanel';
import DraftInsights from './components/DraftInsights';
import GamePlan from './components/GamePlan';
import Topbar from './components/Topbar';
import ProfileModal from './components/ProfileModal';
import LegalModal from './components/LegalModal';
import { heroSearchScore } from './data/heroAliases';

const emptyDraft = () => ({ allies: [], enemies: [], bans: [], self: null });
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const laneLabels = { all: 'FLEX', safe: 'POSITION 1 · SAFE LANE', mid: 'POSITION 2 · MID', off: 'POSITION 3 · OFFLANE', support4: 'POSITION 4 · SUPPORT', support5: 'POSITION 5 · HARD SUPPORT', jungle: 'JUNGLER', roam: 'ROAMER' };

function metaScoreFromStat(stat) {
  const wr = heroBaseWinRate(stat);
  const picks = Number(stat?.pub_pick || 0);
  const sampleLift = Math.min(1, Math.log10(Math.max(10, picks)) / 5);
  return clamp(5 + (wr - 0.5) * 90 * (0.65 + sampleLift * 0.35), 0, 10);
}

function matchesLane(hero, lane) {
  if (lane === 'all') return true;
  const lanes = (hero.lanes || []).map(x => String(x).toLowerCase());
  const roles = (hero.roles || []).map(x => String(x).toLowerCase());
  const hints = (hero.roleHints || []).map(x => String(x).toLowerCase());
  const has = role => roles.includes(role);
  const isSupport = has('support') || hints.includes('support');
  if (lane === 'safe') return has('carry') || hints.includes('carry');
  if (lane === 'mid') return lanes.includes('mid') || hints.includes('mid') || (has('carry') && has('nuker') && !isSupport);
  if (lane === 'off') return lanes.includes('off') || hints.includes('offlane') || (has('durable') && (has('initiator') || has('disabler')));
  if (lane === 'support4') return isSupport && (lanes.includes('roam') || lanes.includes('off') || has('disabler') || has('initiator') || has('escape') || has('nuker'));
  if (lane === 'support5') return isSupport && (lanes.includes('safe') || (!has('carry') && !has('escape')));
  if (lane === 'jungle') return lanes.includes('jungle') || hints.includes('jungle');
  if (lane === 'roam') return lanes.includes('roam') || (isSupport && (has('escape') || has('initiator')));
  return true;
}

function recentSummary(matches = []) {
  if (!matches.length) return { count: 0, winRate: null, kda: null, gpm: null, xpm: null };
  const rows = matches.slice(0, 20);
  let wins = 0, kills = 0, deaths = 0, assists = 0, gpm = 0, xpm = 0;
  for (const m of rows) {
    const radiant = Number(m.player_slot || 0) < 128;
    if (Boolean(m.radiant_win) === radiant) wins += 1;
    kills += Number(m.kills || 0); deaths += Number(m.deaths || 0); assists += Number(m.assists || 0);
    gpm += Number(m.gold_per_min || 0); xpm += Number(m.xp_per_min || 0);
  }
  const n = rows.length;
  return {
    count: n,
    winRate: wins / n * 100,
    kda: `${(kills / n).toFixed(1)} / ${(deaths / n).toFixed(1)} / ${(assists / n).toFixed(1)}`,
    gpm: Math.round(gpm / n), xpm: Math.round(xpm / n),
  };
}

export default function App() {
  const [heroes, setHeroes] = useState([]);
  const [heroStats, setHeroStats] = useState([]);
  const [player, setPlayer] = useState(null);
  const [winLoss, setWinLoss] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [allMatches, setAllMatches] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [playerHeroRows, setPlayerHeroRows] = useState([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [enemyMatrix, setEnemyMatrix] = useState(new Map());
  const [durationData, setDurationData] = useState(new Map());
  const [durationLoading, setDurationLoading] = useState(false);
  const [selectedPairsLive, setSelectedPairsLive] = useState([]);
  const [selectedPairLoading, setSelectedPairLoading] = useState(false);
  const [selectedPairError, setSelectedPairError] = useState(false);
  const [itemPopularity, setItemPopularity] = useState(null);
  const [itemConstants, setItemConstants] = useState({});
  const [itemLoading, setItemLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [attr, setAttr] = useState('allFilter');
  const [laneFilter, setLaneFilter] = useState('all');
  const [playerSide, setPlayerSide] = useState('radiant');
  const [view, setView] = useState('draft');
  const [advisorMode, setAdvisorMode] = useState('best');
  const [profileOpen, setProfileOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const lastAutoPlanSignatureRef = useRef('');

  const statById = useMemo(() => new Map(heroStats.map(s => [Number(s.id), s])), [heroStats]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [roster, stats] = await Promise.all([fetchHeroes(), fetchHeroStats()]);
        if (cancelled) return;
        setHeroes(roster.filter(h => h.id && h.localized_name).map(h => ({ ...h, portrait: portraitUrl(h) })).sort((a, b) => a.localized_name.localeCompare(b.localized_name)));
        setHeroStats(stats);
      } catch (error) { console.error(error); }
      finally { if (!cancelled) setRosterLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProfileLoading(true);
      try {
        const results = await Promise.allSettled([
          fetchPlayer(DEFAULT_PROFILE.accountId), fetchPlayerHeroes(DEFAULT_PROFILE.accountId),
          fetchPlayerWinLoss(DEFAULT_PROFILE.accountId), fetchRecentMatches(DEFAULT_PROFILE.accountId),
        ]);
        if (cancelled) return;
        if (results[0].status === 'fulfilled') setPlayer(results[0].value);
        if (results[1].status === 'fulfilled') setPlayerHeroRows(results[1].value);
        if (results[2].status === 'fulfilled') setWinLoss(results[2].value);
        if (results[3].status === 'fulfilled') setRecentMatches(results[3].value);
      } finally { if (!cancelled) setProfileLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!profileOpen || allMatches.length) return undefined;
    (async () => {
      setHistoryLoading(true); setHistoryError(false);
      try {
        const rows = await fetchPlayerMatchHistory(DEFAULT_PROFILE.accountId);
        if (!cancelled) setAllMatches(rows);
      } catch (error) {
        console.warn('Full public match history unavailable', error);
        if (!cancelled) setHistoryError(true);
      } finally { if (!cancelled) setHistoryLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [profileOpen, allMatches.length]);

  useEffect(() => {
    let cancelled = false;
    if (!draft.enemies.length) { setEnemyMatrix(new Map()); setMatrixLoading(false); return undefined; }
    (async () => {
      setMatrixLoading(true);
      const next = new Map();
      await Promise.all(draft.enemies.map(async enemy => {
        try { next.set(enemy.id, await fetchHeroMatchups(enemy.id)); }
        catch (error) { console.warn(`Could not load matchup rows for ${enemy.localized_name}`, error); }
      }));
      if (!cancelled) { setEnemyMatrix(next); setMatrixLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [draft.enemies]);

  useEffect(() => {
    let cancelled = false;
    const selected = [...draft.allies, ...draft.enemies].filter((h, i, rows) => rows.findIndex(x => x.id === h.id) === i);
    if (!selected.length) { setDurationData(new Map()); setDurationLoading(false); return undefined; }
    (async () => {
      setDurationLoading(true);
      const next = new Map();
      await Promise.all(selected.map(async hero => {
        if (next.has(hero.id)) return;
        try { next.set(hero.id, await fetchHeroDurations(hero.id)); } catch (error) { console.warn(`Duration data unavailable for ${hero.localized_name}`, error); }
      }));
      if (!cancelled) { setDurationData(next); setDurationLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [draft.allies, draft.enemies]);

  useEffect(() => {
    let cancelled = false;
    if (!draft.self || !draft.enemies.length) { setSelectedPairsLive([]); setSelectedPairLoading(false); setSelectedPairError(false); return undefined; }
    (async () => {
      setSelectedPairLoading(true); setSelectedPairError(false);
      try {
        const rows = await fetchHeroMatchups(draft.self.id);
        const pairs = draft.enemies.map(enemy => {
          const row = rows.find(r => Number(r.hero_id) === Number(enemy.id));
          if (!row || !Number(row.games_played || 0)) return { hero: enemy, score: 0, confidence: 0, games: 0 };
          const result = pairCounterScore({
            pairWins: Number(row.wins || 0), pairGames: Number(row.games_played || 0),
            candidateBase: heroBaseWinRate(statById.get(Number(draft.self.id))), enemyBase: heroBaseWinRate(statById.get(Number(enemy.id))),
          });
          return { hero: enemy, ...result };
        });
        if (!cancelled) setSelectedPairsLive(pairs);
      } catch (error) {
        console.warn('Direct selected-hero matchup fetch failed', error);
        if (!cancelled) { setSelectedPairError(true); setSelectedPairsLive([]); }
      } finally { if (!cancelled) setSelectedPairLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [draft.self, draft.enemies, statById]);

  useEffect(() => {
    let cancelled = false;
    if (!draft.self) { setItemPopularity(null); setItemLoading(false); return undefined; }
    (async () => {
      setItemLoading(true);
      try {
        const [popularity, items] = await Promise.all([fetchHeroItemPopularity(draft.self.id), fetchItems()]);
        if (!cancelled) { setItemPopularity(popularity); setItemConstants(items || {}); }
      } catch (error) { console.warn('Item baseline unavailable', error); if (!cancelled) setItemPopularity(null); }
      finally { if (!cancelled) setItemLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [draft.self]);

  useEffect(() => {
    const complete = draft.allies.length === 5 && draft.enemies.length === 5;
    if (complete && !draft.self) {
      const inferredSelf = draft.allies[draft.allies.length - 1];
      setDraft(current => current.self ? current : { ...current, self: inferredSelf });
      return;
    }
    const ready = complete && Boolean(draft.self);
    if (!ready) { lastAutoPlanSignatureRef.current = ''; return; }
    const signature = `${draft.self.id}|${draft.allies.map(h=>h.id).join('-')}|${draft.enemies.map(h=>h.id).join('-')}`;
    if (view === 'draft' && signature !== lastAutoPlanSignatureRef.current) {
      lastAutoPlanSignatureRef.current = signature;
      setView('gameplan');
    }
  }, [draft.self, draft.allies, draft.enemies, view]);

  const personalForHero = useMemo(() => buildPersonalScores(playerHeroRows, DEFAULT_PROFILE.manualPreferences), [playerHeroRows]);

  const scoreBundle = useMemo(() => {
    const scores = new Map(); const pairBreakdowns = new Map();
    for (const hero of heroes) {
      const personal = personalForHero(hero);
      const pairScores = draft.enemies.map(enemy => {
        const rows = enemyMatrix.get(enemy.id) || [];
        const row = rows.find(r => Number(r.hero_id) === Number(hero.id));
        if (!row) return { hero: enemy, score: 0, confidence: 0, games: 0 };
        const result = pairCounterScore({
          pairWins: Number(row.games_played || 0) - Number(row.wins || 0), pairGames: Number(row.games_played || 0),
          candidateBase: heroBaseWinRate(statById.get(Number(hero.id))), enemyBase: heroBaseWinRate(statById.get(Number(enemy.id))),
        });
        return { hero: enemy, ...result };
      });
      const enemyScore = aggregateEnemyScore(pairScores);
      const teammates = draft.allies.filter(a => a.id !== hero.id);
      const synergyScore = compositionSynergyScore(hero, teammates);
      const teamFit = compositionFit(hero, teammates);
      const metaScore = metaScoreFromStat(statById.get(Number(hero.id)));
      const draftFit = draftFitScore({ enemyScore, synergyScore, teamFit, metaScore });
      const overall = overallRecommendation({ enemyScore, synergyScore, teamFit, personalFit: personal.score, metaScore });
      scores.set(hero.id, { enemyScore, synergyScore, teamFit, personalFit: personal.score, metaScore, draftFit, overall, personal });
      pairBreakdowns.set(hero.id, pairScores);
    }
    return { scores, pairBreakdowns };
  }, [heroes, draft.allies, draft.enemies, enemyMatrix, personalForHero, statById]);

  const usedIds = useMemo(() => new Set([...draft.allies.map(h => h.id), ...draft.enemies.map(h => h.id), ...draft.bans.map(h => h.id)]), [draft]);
  const roleEligibleHeroes = useMemo(() => heroes.filter(hero => matchesLane(hero, laneFilter)), [heroes, laneFilter]);
  const filteredHeroes = useMemo(() => heroes.filter(hero => {
    if (attr !== 'allFilter' && hero.primary_attr !== attr) return false;
    if (query && heroSearchScore(hero, query) < 0) return false;
    return true;
  }).sort((a,b) => query ? (heroSearchScore(b, query) - heroSearchScore(a, query) || a.localized_name.localeCompare(b.localized_name)) : a.localized_name.localeCompare(b.localized_name)), [heroes, attr, query]);

  const recommendations = useMemo(() => {
    let rows = roleEligibleHeroes.filter(hero => !usedIds.has(hero.id)).map(hero => ({ hero, score: scoreBundle.scores.get(hero.id), personal: scoreBundle.scores.get(hero.id)?.personal, pairs: scoreBundle.pairBreakdowns.get(hero.id) || [] })).filter(x => x.score);
    if (advisorMode === 'counter') rows.sort((a,b) => b.score.enemyScore - a.score.enemyScore || b.score.draftFit - a.score.draftFit);
    else if (advisorMode === 'meta') rows.sort((a,b) => b.score.metaScore - a.score.metaScore || b.score.draftFit - a.score.draftFit);
    else if (advisorMode === 'personal') rows.sort((a,b) => b.score.overall - a.score.overall);
    else if (advisorMode === 'learn') {
      const stretch = rows.filter(x => x.score.personalFit < 60 && x.score.draftFit >= 5.25).sort((a,b) => b.score.draftFit - a.score.draftFit);
      const rest = rows.filter(x => !stretch.includes(x)).sort((a,b) => b.score.draftFit - a.score.draftFit);
      rows = [...stretch, ...rest];
    } else rows.sort((a,b) => b.score.draftFit - a.score.draftFit || b.score.overall - a.score.overall);
    return rows;
  }, [roleEligibleHeroes, usedIds, scoreBundle, advisorMode]);

  const personalSummary = useMemo(() => {
    const values = heroes.map(h => scoreBundle.scores.get(h.id)?.personal).filter(Boolean);
    return { played: values.filter(x => x.games > 0).length, comfort: values.filter(x => x.score >= 68).length, learning: values.filter(x => x.score < 38).length };
  }, [heroes, scoreBundle]);

  function stateForHero(id) {
    if (draft.self?.id === id) return 'self'; if (draft.allies.some(h => h.id === id)) return 'ally';
    if (draft.enemies.some(h => h.id === id)) return 'enemy'; if (draft.bans.some(h => h.id === id)) return 'ban'; return 'available';
  }

  function removeHero(id) {
    setDraft(current => ({ allies: current.allies.filter(h => h.id !== id), enemies: current.enemies.filter(h => h.id !== id), bans: current.bans.filter(h => h.id !== id), self: current.self?.id === id ? null : current.self }));
  }

  function actOnHero(hero, action) {
    setDraft(current => {
      const scrubbed = {
        allies: current.allies.filter(h => h.id !== hero.id),
        enemies: current.enemies.filter(h => h.id !== hero.id),
        bans: current.bans.filter(h => h.id !== hero.id),
        self: current.self?.id === hero.id ? null : current.self,
      };
      const replaceLast = (rows, preserveId = null) => {
        if (rows.length < 5) return [...rows, hero];
        let index = rows.length - 1;
        if (preserveId && rows[index]?.id === preserveId) {
          const fallbackIndex = [...rows].map((row,i)=>({row,i})).reverse().find(x => x.row.id !== preserveId)?.i;
          if (fallbackIndex != null) index = fallbackIndex;
        }
        const next = [...rows]; next[index] = hero; return next;
      };
      if (action === 'ally') return { ...scrubbed, allies: replaceLast(scrubbed.allies, scrubbed.self?.id) };
      if (action === 'enemy') return { ...scrubbed, enemies: replaceLast(scrubbed.enemies) };
      if (action === 'ban') return { ...scrubbed, bans: [...scrubbed.bans, hero] };
      if (action === 'self') {
        const withoutOldSelf = current.self ? scrubbed.allies.filter(h => h.id !== current.self.id) : scrubbed.allies;
        const allies = replaceLast(withoutOldSelf);
        return { ...scrubbed, self: hero, allies };
      }
      return current;
    });
  }

  function swapTeams() {
    setDraft(current => ({
      allies: current.enemies,
      enemies: current.allies,
      bans: current.bans,
      self: null,
    }));
    setView('draft');
    lastAutoPlanSignatureRef.current = '';
  }

  function hardReset() {
    setDraft(emptyDraft());
    setView('draft');
    setQuery('');
    setAttr('allFilter');
    setLaneFilter('all');
    setAdvisorMode('best');
    setPlayerSide('radiant');
    setProfileOpen(false);
    setLegalOpen(false);
    try {
      ['dotasage:observed-enemy-items','dotasage:match-minute','dotasage:match-state','dotasage:match-clock-start','dotasage:match-signature','dotasage:lane-overrides'].forEach(key => sessionStorage.removeItem(key));
    } catch {}
  }


  const lineupRatings = useMemo(() => {
    const allies = new Map(); const enemies = new Map();
    for (const ally of draft.allies) {
      allies.set(ally.id, aggregateEnemyScore(scoreBundle.pairBreakdowns.get(ally.id) || []));
    }
    for (const enemy of draft.enemies) {
      const reverse = draft.allies.map(ally => (scoreBundle.pairBreakdowns.get(ally.id) || []).find(row => row.hero?.id === enemy.id)).filter(Boolean).map(row => ({ ...row, score: -row.score }));
      enemies.set(enemy.id, aggregateEnemyScore(reverse));
    }
    return { allies, enemies };
  }, [draft.allies, draft.enemies, scoreBundle]);

  const draftComplete = draft.allies.length === 5 && draft.enemies.length === 5;

  const selectedScore = draft.self ? scoreBundle.scores.get(draft.self.id) : null;
  const cachedSelectedPairs = draft.self ? scoreBundle.pairBreakdowns.get(draft.self.id) : [];
  const selectedPairs = selectedPairsLive.some(x => x.games > 0) ? selectedPairsLive : cachedSelectedPairs;
  const recent = useMemo(() => recentSummary(recentMatches), [recentMatches]);

  if (view === 'gameplan' && draft.self) return <div className="app-shell gameplan-shell">
    <div className="ambient-grid" />
    <Topbar player={player} profile={DEFAULT_PROFILE} onReset={hardReset} onOpenProfile={() => setProfileOpen(true)} onOpenLegal={() => setLegalOpen(true)} />
    <GamePlan draft={draft} playerSide={playerSide} laneFilter={laneFilter} lineupRatings={lineupRatings} selectedScore={selectedScore} pairBreakdown={selectedPairs} pairLoading={selectedPairLoading} pairError={selectedPairError && !selectedPairs.some(x => x.games > 0)} positionLabel={laneLabels[laneFilter]} itemPopularity={itemPopularity} itemConstants={itemConstants} itemLoading={itemLoading} onBack={() => setView('draft')} />
    <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} profile={DEFAULT_PROFILE} player={player} winLoss={winLoss} recentMatches={recentMatches} allMatches={allMatches} historyLoading={historyLoading} historyError={historyError} playerHeroRows={playerHeroRows} heroes={heroes} recentSummary={recent} />
    <LegalModal open={legalOpen} onClose={() => setLegalOpen(false)} />
  </div>;

  return (
    <div className="app-shell">
      <div className="ambient-grid" />
      <Topbar player={player} profile={DEFAULT_PROFILE} onReset={hardReset} onOpenProfile={() => setProfileOpen(true)} onOpenLegal={() => setLegalOpen(true)} />

      <div className="command-layout">
        <aside className="left-rail">
          <PlayerProfile profile={DEFAULT_PROFILE} player={player} loading={profileLoading} personalSummary={personalSummary} winLoss={winLoss} recentSummary={recent} onOpenProfile={() => setProfileOpen(true)} />
          <DraftBoard draft={draft} onRemove={removeHero} onClear={() => { setDraft(emptyDraft()); lastAutoPlanSignatureRef.current = ''; }} onOpenGamePlan={() => setView('gameplan')} playerSide={playerSide} onSideChange={setPlayerSide} onSwapTeams={swapTeams} />
        </aside>

        <main className="center-stage">
          <HeroGrid allHeroes={heroes} roleHeroes={roleEligibleHeroes} heroes={filteredHeroes} scores={scoreBundle.scores} stateForHero={stateForHero} onAction={actOnHero} query={query} setQuery={setQuery} attr={attr} setAttr={setAttr} loadingLive={matrixLoading || rosterLoading} laneFilter={laneFilter} playerSide={playerSide} />
          <RecommendationPanel recommendations={recommendations} onPick={actOnHero} draftComplete={draftComplete} allyCount={draft.allies.length} enemyCount={draft.enemies.length} laneLabel={laneLabels[laneFilter]} laneFilter={laneFilter} setLaneFilter={setLaneFilter} matrixLoading={matrixLoading} advisorMode={advisorMode} setAdvisorMode={setAdvisorMode} playerSide={playerSide} />
        </main>

        <DraftInsights draft={draft} matrixLoading={matrixLoading} durationData={durationData} durationLoading={durationLoading} />
      </div>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} profile={DEFAULT_PROFILE} player={player} winLoss={winLoss} recentMatches={recentMatches} allMatches={allMatches} historyLoading={historyLoading} historyError={historyError} playerHeroRows={playerHeroRows} heroes={heroes} recentSummary={recent} />
      <LegalModal open={legalOpen} onClose={() => setLegalOpen(false)} />
    </div>
  );
}
