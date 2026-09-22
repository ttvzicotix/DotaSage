import assert from 'node:assert/strict';
import { decodeDraftState, draftPayload, encodeDraftState } from '../src/utils/draftShare.js';

const payload = draftPayload({
  draft: {
    allies: [{ id: 1 }, { id: 2 }],
    enemies: [{ id: 3 }, { id: 4 }],
    bans: [{ id: 5 }],
    self: { id: 2 },
  },
  playerSide: 'dire',
  laneFilter: 'off',
  advisorMode: 'counter',
});

const encoded = encodeDraftState(payload);
assert.ok(encoded && !encoded.includes('/'), 'draft link payload should be URL-safe');
assert.deepEqual(decodeDraftState(encoded), payload);
assert.equal(decodeDraftState('not-valid-base64'), null);

console.log('Draft share-state regression: PASS');
