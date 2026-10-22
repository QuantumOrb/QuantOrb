'use strict';
/* Every example in examples/ carries the verdict it must get. Six of them were produced by the closed
   server itself (the site's example token and five scans on the simulated chain), so passing here means
   the open rules give the same answer as quantumorb.app. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { scanVerdict } = require('../rules');

const DIR = path.join(__dirname, '..', 'examples');
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort();

test('there are examples to check', () => assert.ok(files.length >= 8));

for (const f of files) {
  test('examples/' + f, () => {
    const x = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    const r = scanVerdict(x);
    assert.strictEqual(r.state, x.expect.state);
    assert.strictEqual(r.band, x.expect.band);
    assert.strictEqual(r.score, x.expect.score);
    assert.deepStrictEqual(r.parts || null, x.expect.parts);
    assert.strictEqual(r.headline, x.expect.headline);
    assert.deepStrictEqual((r.gates || []).map(g => g.text), x.expect.gates);
    assert.strictEqual(r.scenario ? +r.scenario.drop.toFixed(4) : null, x.expect.scenarioDrop);
  });
}
