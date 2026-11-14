// Self-check: node src/data/lrc.check.mjs
import assert from 'assert';
import { parseLrc, activeLine } from './lrc.js';

const l = parseLrc('[ar: x]\n[00:12.50] Hello\n[01:02.00][00:05.00] Chorus\n\n[00:20] ');
assert.deepStrictEqual(l.map((x) => x.time), [5000, 12500, 20000, 62000]);
assert.strictEqual(l[0].text, 'Chorus');
assert.strictEqual(activeLine(l, 0), -1);
assert.strictEqual(activeLine(l, 12500), 1);
assert.strictEqual(activeLine(l, 999999), 3);
console.log('lrc ok');
