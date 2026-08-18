const COMMON_ALIASES = {
  'Abaddon': ['aba'], 'Alchemist': ['alch'], 'Anti-Mage': ['am'], 'Ancient Apparition': ['aa'], 'Arc Warden': ['aw','arc'],
  'Batrider': ['bat'], 'Beastmaster': ['bm','beast'], 'Bloodseeker': ['bs'], 'Bounty Hunter': ['bh'], 'Brewmaster': ['bm','brew'], 'Bristleback': ['bb'], 'Broodmother': ['bm','brood'],
  'Centaur Warrunner': ['cent','cw'], 'Chaos Knight': ['ck'], 'Clockwerk': ['clock'], 'Crystal Maiden': ['cm'],
  'Dark Seer': ['ds'], 'Dark Willow': ['dw'], 'Dawnbreaker': ['db','dawn'], 'Dazzle': ['daz'], 'Death Prophet': ['dp'], 'Disruptor': ['dis'], 'Dragon Knight': ['dk'], 'Drow Ranger': ['drow','dr'],
  'Earthshaker': ['es','shaker'], 'Earth Spirit': ['es','espirit'], 'Elder Titan': ['et'], 'Ember Spirit': ['es','ember'], 'Enchantress': ['ench'], 'Enigma': ['enig'],
  'Faceless Void': ['fv','void'], 'Grimstroke': ['grim'], 'Gyrocopter': ['gyro'], 'Hoodwink': ['hood'],
  'Invoker': ['invo'], 'Io': ['wisp'], 'Juggernaut': ['jugg','jug'], 'Keeper of the Light': ['kotl'],
  'Legion Commander': ['lc'], 'Leshrac': ['lesh'], 'Lifestealer': ['ls','naix'], 'Lone Druid': ['ld'],
  'Magnus': ['mag'], 'Medusa': ['dusa'], 'Mirana': ['potm'], 'Monkey King': ['mk'], 'Morphling': ['morph'],
  "Nature's Prophet": ['np','furion'], 'Naga Siren': ['naga'], 'Necrophos': ['necro'], 'Night Stalker': ['ns'], 'Nyx Assassin': ['nyx'],
  'Ogre Magi': ['ogre'], 'Omniknight': ['omni'], 'Outworld Destroyer': ['od','outworld'],
  'Pangolier': ['pango'], 'Phantom Assassin': ['pa'], 'Phantom Lancer': ['pl'], 'Phoenix': ['phx'], 'Primal Beast': ['pb'],
  'Queen of Pain': ['qop'], 'Ringmaster': ['rm'],
  'Sand King': ['sk'], 'Shadow Demon': ['sd'], 'Shadow Fiend': ['sf','nevermore'], 'Shadow Shaman': ['ss','shaman','rhasta'], 'Silencer': ['sil'], 'Skywrath Mage': ['sky'], 'Slardar': ['slard'], 'Snapfire': ['snap'], 'Spectre': ['spec'], 'Spirit Breaker': ['sb','bara'], 'Storm Spirit': ['ss','storm'],
  'Templar Assassin': ['ta'], 'Terrorblade': ['tb'], 'Tidehunter': ['tide'], 'Timbersaw': ['timber'], 'Tinker': ['tink'], 'Treant Protector': ['treant'], 'Troll Warlord': ['troll'],
  'Underlord': ['ul'], 'Undying': ['undy'], 'Vengeful Spirit': ['vs','venge'], 'Venomancer': ['veno'], 'Void Spirit': ['vs','vspirit'],
  'Warlock': ['wl'], 'Windranger': ['wr','windrunner'], 'Winter Wyvern': ['ww'], 'Witch Doctor': ['wd'], 'Wraith King': ['wk','skeleton king'],
};

function normalize(value) {
  return String(value || '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function heroSearchTerms(hero) {
  const name = normalize(hero.localized_name);
  const words = name.split(/\s+/).filter(Boolean);
  const initials = words.map(word => word[0]).join('');
  const joined = words.join('');
  const internal = normalize(String(hero.name || '').replace('npc_dota_hero_', '').replace(/_/g, ' '));
  const generated = new Set([
    name,
    joined,
    initials,
    internal,
    words[0]?.slice(0, 2),
    words[0]?.slice(0, 3),
    ...words,
    ...(COMMON_ALIASES[hero.localized_name] || []).map(normalize),
  ].filter(Boolean));
  return [...generated];
}

export function heroSearchScore(hero, rawQuery) {
  const query = normalize(rawQuery);
  if (!query) return 0;
  const name = normalize(hero.localized_name);
  const terms = heroSearchTerms(hero);
  const explicit = (COMMON_ALIASES[hero.localized_name] || []).map(normalize);
  if (name === query) return 100;
  if (explicit.includes(query)) return 95;
  if (terms.includes(query)) return 90;
  if (name.startsWith(query)) return 80;
  if (terms.some(term => term.startsWith(query))) return 70;
  if (name.includes(query)) return 55;
  if (terms.some(term => term.includes(query))) return 45;
  return -1;
}
