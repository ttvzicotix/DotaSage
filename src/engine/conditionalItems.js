// Pure enemy-aware item selection. Kept independent of React for regression testing.
const searchNormalize = value => String(value ?? '').replace(/^item_/, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const hasRole = (hero, role) => (hero?.roles || []).some(row => String(row).toLowerCase() === String(role).toLowerCase());

function findItem(items, names = []) {
  // Recommendation names are ordered fallbacks, not a set to search by catalog order.
  for (const name of names) {
    const wanted = searchNormalize(name);
    const match = items.find(item => searchNormalize(item.dname) === wanted || searchNormalize(item.name) === wanted);
    if (match) return match;
  }
  return undefined;
}

// Keep partial successful requests aligned with the enemy they describe.
export function collectEnemyItemPopularity(enemies = [], settled = []) {
  const reports = new Map();
  settled.forEach((result, index) => {
    const id = Number(enemies[index]?.id);
    if (result?.status === 'fulfilled' && result.value && Number.isFinite(id) && id > 0) {
      reports.set(id, result.value);
    }
  });
  return reports;
}

function countEnemyRole(enemies, role) {
  return enemies.filter(hero => hasRole(hero, role)).length;
}

export function topTrendItemIds(popularity, limit = 8) {
  if (!popularity) return new Set();
  const groups = [popularity.early_game_items, popularity.mid_game_items, popularity.late_game_items];
  // One item can appear in several game phases. Rank distinct items, not phase entries.
  const counts = new Map();
  for (const group of groups) {
    for (const [rawId, rawUses] of Object.entries(group || {})) {
      const id = Number(rawId);
      const uses = Number(rawUses);
      if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(uses) || uses <= 0) continue;
      counts.set(id, Math.max(counts.get(id) || 0, uses));
    }
  }
  return new Set([...counts].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id));
}

export function enemyTrendCount(enemyItemPopularity, items, names = []) {
  const target = findItem(items, names);
  if (!target) return 0;
  let count = 0;
  for (const popularity of enemyItemPopularity?.values?.() || []) {
    if (topTrendItemIds(popularity, 10).has(Number(target.id))) count += 1;
  }
  return count;
}

function enemyThreats(enemies = []) {
  const names = new Set(enemies.map(hero => hero.localized_name));
  const hasAny = list => list.some(name => names.has(name));
  return {
    silence: hasAny(['Silencer', 'Death Prophet', 'Drow Ranger', 'Night Stalker', 'Puck', 'Skywrath Mage', 'Disruptor', 'Grimstroke']),
    targetedBurst: hasAny(['Legion Commander', 'Doom', 'Bane', 'Beastmaster', 'Lion', 'Lina', 'Necrophos', 'Nyx Assassin', 'Shadow Shaman']),
    evasion: hasAny(['Phantom Assassin', 'Windranger', 'Brewmaster']),
    illusions: hasAny(['Phantom Lancer', 'Naga Siren', 'Terrorblade', 'Chaos Knight', 'Meepo']),
    sustain: hasAny(['Huskar', 'Alchemist', 'Morphling', 'Necrophos', 'Death Prophet', 'Timbersaw', 'Bristleback']),
    magicBurst: hasAny(['Zeus', 'Lina', 'Leshrac', 'Skywrath Mage', 'Invoker', 'Pugna', 'Lion', 'Storm Spirit']),
    summons: hasAny(['Chen', 'Enchantress', 'Beastmaster', 'Lycan', 'Broodmother', 'Nature\'s Prophet', 'Visage']),
    invis: hasAny(['Riki', 'Bounty Hunter', 'Clinkz', 'Nyx Assassin', 'Mirana', 'Weaver']),
  };
}

export function conditionalItems(hero, enemies = [], items = [], observedCounts = {}, enemyItemPopularity = new Map()) {
  const rows = [];
  const support = hasRole(hero, 'Support');
  // OpenDota can tag supports as Nukers; that alone should not enable carry-only pivots.
  const core = !support && (hasRole(hero, 'Carry') || hasRole(hero, 'Nuker'));
  const threats = enemyThreats(enemies);
  const likely = (...names) => enemyTrendCount(enemyItemPopularity, items, names);
  const observed = name => {
    const item = findItem(items, [name]);
    return item ? Number(observedCounts[item.id] || 0) : 0;
  };
  const add = (condition, names, title, reason, priority = false) => {
    if (!condition) return;
    const item = findItem(items, names);
    if (!item || rows.some(row => row.item.id === item.id)) return;
    rows.push({ item, title, reason, priority });
  };

  add((observed('Butterfly') > 0 || likely('Butterfly') > 0 || threats.evasion) && core, ['Monkey King Bar'], 'ACCURACY NOW MATTERS', observed('Butterfly') > 0 ? 'An observed Butterfly makes MKB a concrete response.' : 'Enemy picks or common purchases create a real evasion risk.', observed('Butterfly') > 0);
  add((observed('Black King Bar') > 0 || likely('Black King Bar') >= 2) && support, ['Force Staff', 'Ghost Scepter', 'Glimmer Cape'], 'BKB WINDOWS WILL MATTER', 'Multiple enemy cores commonly buy spell immunity; prioritize surviving or repositioning through their commitment instead of feeding into the BKB window.');
  add((likely("Linken's Sphere") > 0 || threats.targetedBurst) && core, ['Black King Bar', "Linken's Sphere"], 'PROTECT THE KEY CAST WINDOW', 'Targeted disables or burst make spell protection more valuable than a generic damage slot.');
  add((likely('Orchid Malevolence') > 0 || likely('Bloodthorn') > 0 || threats.silence) && !support, ['Black King Bar', 'Manta Style'], 'SILENCE CAN SHUT YOU DOWN', 'Enemy abilities or common silence purchases threaten your ability to cast or escape.');
  add((likely('Pipe of Insight') > 0 || threats.magicBurst) && support, ['Pipe of Insight', 'Glimmer Cape'], 'MAGIC BURST IS THE FIGHT', 'Enemy spell damage profile makes team or single-target magic mitigation high value.');
  const observedSustain = observed('Satanic') + observed('Heart of Tarrasque') > 0;
  add((observedSustain || likely('Heart of Tarrasque') > 0 || likely('Satanic') > 0 || threats.sustain), support ? ['Spirit Vessel'] : ['Eye of Skadi', 'Spirit Vessel'], observedSustain ? 'SUSTAIN IS SHOWING' : 'CUT THEIR SUSTAIN', observedSustain ? 'Observed sustain makes anti-heal more valuable.' : 'Enemy heroes or common purchases rely on healing, regen, or lifesteal.', observedSustain);
  add((likely('Manta Style') > 0 || threats.illusions || threats.summons), core ? ['Mjollnir', 'Maelstrom', 'Battle Fury'] : ["Shiva's Guard"], 'CLEAR EXTRA UNITS', 'Enemy illusions, summons, or common Manta purchases reward repeatable area damage.');
  add(threats.invis && support, ['Dust of Appearance', 'Sentry Ward', 'Gem of True Sight'], 'REVEAL IS MANDATORY', 'Enemy heroes can rely on invisibility; reserve detection instead of treating it as an optional slot.');
  add(observed('Ghost Scepter') + observed("Eul's Scepter of Divinity") + observed('Glimmer Cape') > 0 && core, ['Nullifier'], 'SAVES ARE BLOCKING KILLS', 'Enemy defensive items are already resetting physical kill attempts.', true);
  add(countEnemyRole(enemies, 'Disabler') >= 2 || countEnemyRole(enemies, 'Nuker') >= 3, core ? ['Black King Bar'] : ['Force Staff', 'Glimmer Cape'], 'IF CONTROL STOPS YOUR JOB', core ? 'Protect the damage window.' : 'Create space for yourself or a core.');
  add(countEnemyRole(enemies, 'Initiator') >= 2, support ? ['Force Staff'] : ["Linken's Sphere", 'Black King Bar'], 'IF YOU KEEP GETTING JUMPED', 'Survive or redirect the first enemy commitment.');
  add(countEnemyRole(enemies, 'Carry') >= 2, support ? ['Ghost Scepter', "Heaven's Halberd"] : ['Butterfly', "Shiva's Guard"], 'IF PHYSICAL DAMAGE TAKES OVER', 'Shift a slot toward surviving right-click commitment.');
  add(threats.illusions, core ? ['Mjollnir', 'Maelstrom', 'Battle Fury'] : ["Shiva's Guard"], 'IF ILLUSIONS TAKE OVER', 'Add repeatable area damage or control.');
  return rows.sort((a, b) => Number(b.priority) - Number(a.priority)).slice(0, 6);
}

