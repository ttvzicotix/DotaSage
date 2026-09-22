import { FALLBACK_HEROES } from '../data/fallbackHeroes.js';

const BASE = 'https://api.opendota.com/api';
const matchupCache = new Map();
const durationCache = new Map();
const itemPopularityCache = new Map();
let heroStatsCache = null;
let itemsCache = null;

const slugOverrides = {
  'Anti-Mage': 'antimage', 'Centaur Warrunner': 'centaur', Clockwerk: 'rattletrap', Doom: 'doom_bringer',
  Io: 'wisp', Kunkka: 'kunkka', Lifestealer: 'life_stealer', Magnus: 'magnataur', "Nature's Prophet": 'furion',
  Necrophos: 'necrolyte', 'Outworld Destroyer': 'obsidian_destroyer', 'Queen of Pain': 'queenofpain',
  'Shadow Fiend': 'nevermore', Timbersaw: 'shredder', 'Treant Protector': 'treant', Underlord: 'abyssal_underlord',
  Windranger: 'windrunner', 'Wraith King': 'skeleton_king', Zeus: 'zuus',
};

const fallbackById = new Map(FALLBACK_HEROES.map(hero => [Number(hero.id), hero]));
const fallbackByName = new Map(FALLBACK_HEROES.map(hero => [hero.localized_name, hero]));

function portraitSlug(hero) {
  if (hero.name?.startsWith('npc_dota_hero_')) return hero.name.replace('npc_dota_hero_', '');
  return slugOverrides[hero.localized_name] || hero.localized_name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function portraitUrl(hero) {
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${portraitSlug(hero)}.png`;
}

function cacheRead(key, ttlMs) {