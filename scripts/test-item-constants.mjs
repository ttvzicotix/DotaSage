import assert from 'node:assert/strict';
import { normalizeItemConstants } from '../src/services/openDota.js';

// Synthetic regression fixture for the namespace bug that produced impossible
// build arrows. This validates ID -> canonical-key normalization; it is not a
// hardcoded source of truth for future Dota patch recipes.
const raw = {
  phase_boots: { id: 50, dname: 'Phase Boots', components: null },
  power_treads: { id: 63, dname: 'Power Treads', components: null },
  blade_of_alacrity: { id: 22, dname: 'Blade of Alacrity', components: null },
  broadsword: { id: 3, dname: 'Broadsword', components: null },
  ogre_axe: { id: 21, dname: 'Ogre Axe', components: null },
  pers: { id: 69, dname: 'Perseverance', components: null },
  ultimate_orb: { id: 24, dname: 'Ultimate Orb', components: null },
  sphere: { id: 123, dname: "Linken's Sphere", components: [69, 24] },
  oblivion_staff: { id: 67, dname: 'Oblivion Staff', components: null },
  echo_sabre: { id: 252, dname: 'Echo Sabre', components: ['oblivion_staff', 'ogre_axe'] },
};

const items = normalizeItemConstants(raw);

assert.deepEqual(items.sphere.components, ['pers', 'ultimate_orb']);
assert.deepEqual(items.echo_sabre.components, ['oblivion_staff', 'ogre_axe']);
assert.equal(items['69'].name, 'pers');
assert.equal(items.item_pers.name, 'pers');

for (const impossible of ['phase_boots', 'power_treads', 'blade_of_alacrity', 'broadsword', 'ogre_axe']) {
  assert.equal(
    items.sphere.components.includes(impossible),
    false,
    `${impossible} must not become a Linken recipe component through ID/display-name matching`,
  );
}

console.log('item constant normalization regression: PASS');
