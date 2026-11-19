import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  collectEnemyItemPopularity, conditionalItems, enemyTrendCount, topTrendItemIds,
} from '../src/engine/conditionalItems.js';

// Synthetic item catalog; test inputs should never rely on a live Dota/OpenDota API.
const names = [
  'Monkey King Bar', 'Butterfly', 'Black King Bar', 'Force Staff', 'Ghost Scepter',
  'Glimmer Cape', "Linken's Sphere", 'Orchid Malevolence', 'Bloodthorn', 'Manta Style',
  'Pipe of Insight', 'Heart of Tarrasque', 'Satanic', 'Spirit Vessel', 'Eye of Skadi',
  'Mjollnir', 'Maelstrom', 'Battle Fury', "Shiva's Guard", 'Dust of Appearance',
  'Sentry Ward', 'Gem of True Sight', "Eul's Scepter of Divinity", 'Nullifier', "Heaven's Halberd",
];
const items = names.map((dname, index) => ({ id: index + 1, dname, name: dname.toLowerCase().replaceAll(' ', '_') }));
const byName = name => items.find(item => item.dname === name).id;
const hero = (name, roles = []) => ({ localized_name: name, roles });
const carry = hero('Juggernaut', ['Carry', 'Escape']);
const support = hero('Crystal Maiden', ['Support', 'Disabler', 'Nuker']);
const blank = hero('Axe', []);
const enemy = (name, roles = []) => ({ localized_name: name, roles });
const trend = (name, count = 100) => ({ mid_game_items: { [byName(name)]: count } });
const popularity = (...reports) => new Map(reports.map((report, index) => [index + 101, report]));
const recommend = (self, enemies = [], observed = {}, trends = new Map()) => conditionalItems(self, enemies, items, observed, trends);
const row = (rows, name) => rows.find(entry => entry.item.dname === name);

test('evasion hero or popular enemy Butterfly prompts MKB for a core', () => {
  assert.ok(row(recommend(carry, [enemy('Windranger')]), 'Monkey King Bar'));
  assert.ok(row(recommend(carry, [], {}, popularity(trend('Butterfly'))), 'Monkey King Bar'));
  assert.ok(row(recommend(carry, [], { [byName('Butterfly')]: 1 }), 'Monkey King Bar')?.priority);
  assert.match(row(recommend(carry, [], { [byName('Butterfly')]: 1 }), 'Monkey King Bar').reason, /observed Butterfly/);
});

test('dual-tagged support-nukers do not receive physical carry accuracy pivots', () => {
  assert.equal(row(recommend(support, [enemy('Phantom Assassin')]), 'Monkey King Bar'), undefined);
  assert.equal(row(recommend(support, [], { [byName('Butterfly')]: 1 }), 'Monkey King Bar'), undefined);
});

test('invisibility triggers support detection but not core detection', () => {
  assert.ok(row(recommend(support, [enemy('Riki')]), 'Dust of Appearance'));
  assert.equal(row(recommend(carry, [enemy('Riki')]), 'Dust of Appearance'), undefined);
});

test('sustain hero and likely sustain item select role-appropriate anti-heal', () => {
  assert.ok(row(recommend(carry, [enemy('Huskar')]), 'Eye of Skadi'));
  assert.ok(row(recommend(support, [enemy('Huskar')]), 'Spirit Vessel'));
  assert.ok(row(recommend(carry, [], {}, popularity(trend('Satanic'))), 'Eye of Skadi'));
});

test('observed Heart upgrades a speculative anti-heal pivot to urgent priority', () => {
  const rows = recommend(carry, [enemy('Huskar')], { [byName('Heart of Tarrasque')]: 1 });
  assert.equal(row(rows, 'Eye of Skadi')?.priority, true);
  assert.equal(row(rows, 'Eye of Skadi')?.title, 'SUSTAIN IS SHOWING');
  assert.equal(rows[0].item.dname, 'Eye of Skadi');
});

test('silence and common Orchid/Bloodthorn threaten non-support spellcasting', () => {
  assert.ok(row(recommend(carry, [enemy('Silencer')]), 'Black King Bar'));
  assert.ok(row(recommend(carry, [], {}, popularity(trend('Bloodthorn'))), 'Black King Bar'));
  assert.equal(row(recommend(support, [enemy('Silencer')]), 'Black King Bar'), undefined);
});

test('illusions and popular Manta direct area clear by role', () => {
  assert.ok(row(recommend(carry, [enemy('Phantom Lancer')]), 'Mjollnir'));
  assert.ok(row(recommend(support, [enemy('Naga Siren')]), "Shiva's Guard"));
  assert.ok(row(recommend(carry, [], {}, popularity(trend('Manta Style'))), 'Mjollnir'));
});

test('BKB trigger requires two likely enemy buyers, or an actual observed BKB', () => {
  assert.equal(row(recommend(support, [], {}, popularity(trend('Black King Bar'))), 'Force Staff'), undefined);
  assert.ok(row(recommend(support, [], {}, popularity(trend('Black King Bar'), trend('Black King Bar'))), 'Force Staff'));
  assert.ok(row(recommend(support, [], { [byName('Black King Bar')]: 1 }), 'Force Staff'));
});

test('defensive saves observed by player take priority over speculative threats', () => {
  const rows = recommend(carry, [enemy('Phantom Assassin'), enemy('Huskar')], { [byName('Glimmer Cape')]: 1 });
  assert.equal(rows[0].item.dname, 'Nullifier');
  assert.equal(rows[0].priority, true);
});

test('targeted burst, magic burst, and observed data all work independently', () => {
  assert.ok(row(recommend(carry, [enemy('Doom')]), 'Black King Bar'));
  assert.ok(row(recommend(support, [enemy('Zeus')]), 'Pipe of Insight'));
  assert.ok(row(recommend(carry, [], {}, popularity(trend("Linken's Sphere"))), 'Black King Bar'));
});

test('partially failed API data maps valid reports to original enemy IDs', () => {
  const enemies = [{ id: 7 }, { id: 8 }, { id: 9 }, { id: 10 }];
  const reports = collectEnemyItemPopularity(enemies, [
    { status: 'fulfilled', value: trend('Butterfly') },
    { status: 'rejected', reason: new Error('OpenDota rate limit') },
    { status: 'fulfilled', value: null },
    { status: 'fulfilled', value: trend('Satanic') },
  ]);
  assert.deepEqual([...reports.keys()], [7, 10]);
  assert.equal(enemyTrendCount(reports, items, ['Butterfly']), 1);
  assert.equal(collectEnemyItemPopularity([], []).size, 0);
});

test('no enemy evidence gives no counter, partial failed data is harmless', () => {
  assert.deepEqual(recommend(carry), []);
  assert.deepEqual(recommend(carry, [], {}, null), []);
  assert.deepEqual(recommend(blank, [enemy('Neutral')], {}, popularity(null, {}, { early_game_items: null })), []);
  assert.equal(enemyTrendCount(popularity(null, {}, trend('Butterfly')), items, ['Butterfly']), 1);
  assert.equal(enemyTrendCount(null, items, ['Butterfly']), 0);
  assert.deepEqual([...topTrendItemIds(undefined)], []);
  assert.deepEqual([...topTrendItemIds({ mid_game_items: { [byName('Butterfly')]: 0 } })], []);
});

test('items popular in multiple phases only consume one top-ten slot', () => {
  const duplicatedPhases = Object.fromEntries(items.filter(item => item.dname !== 'Butterfly').slice(0, 9).map((item, index) => [item.id, 1000 - index]));
  const report = {
    early_game_items: duplicatedPhases,
    mid_game_items: { ...duplicatedPhases, [byName('Butterfly')]: 80 },
    late_game_items: duplicatedPhases,
  };
  assert.equal(topTrendItemIds(report, 10).size, 10);
  assert.equal(topTrendItemIds(report, 10).has(byName('Butterfly')), true);
  assert.ok(row(recommend(carry, [], {}, popularity(report)), 'Monkey King Bar'));
});

test('recommendations are capped at six, unique, and priority-first', () => {
  const foes = [
    enemy('Phantom Assassin', ['Carry', 'Initiator', 'Disabler']),
    enemy('Huskar', ['Carry', 'Initiator', 'Nuker']),
    enemy('Silencer', ['Nuker', 'Disabler']),
    enemy('Phantom Lancer', ['Nuker']),
    enemy('Zeus', ['Nuker']),
  ];
  const rows = recommend(carry, foes, { [byName('Butterfly')]: 1, [byName('Glimmer Cape')]: 1 });
  assert.ok(rows.length <= 6);
  assert.equal(new Set(rows.map(entry => entry.item.id)).size, rows.length);
  assert.equal(rows[0].priority, true);
  const firstNonPriority = rows.findIndex(entry => !entry.priority);
  assert.ok(firstNonPriority < 0 || rows.slice(firstNonPriority).every(entry => !entry.priority));
});
