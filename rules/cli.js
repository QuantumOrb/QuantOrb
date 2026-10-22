#!/usr/bin/env node
'use strict';
/* Prints the verdict for a scan input, the way the site reads it.
   usage: node rules/cli.js examples/site-example.json [--json] */
const fs = require('fs');
const path = require('path');
const { scanVerdict, WEIGHTS } = require('./index');
const { pct } = require('./format');

const args = process.argv.slice(2), file = args.find(a => !a.startsWith('--'));
if (!file) { console.error('usage: node rules/cli.js <scan.json> [--json]'); process.exit(2); }
const input = JSON.parse(fs.readFileSync(file, 'utf8'));
const r = scanVerdict(input);
if (args.includes('--json')) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }

const LABEL = { operator: 'Biggest operator', virgin: 'Fresh wallets', transfer: 'Received, not bought', sniper: 'Unsold snipers', concentration: 'Top-20 share' };
const out = [];
out.push((input.name || path.basename(file)) + (input.symbol ? ' · $' + input.symbol : ''));
out.push(r.headline);
out.push('');
if (r.score == null) out.push(r.band + ' · no score');
else {
  out.push('score ' + r.score + ' / 100 · ' + r.band + (r.state === 'partial' ? ' · PARTIAL' : ''));
  Object.keys(WEIGHTS).forEach(k => out.push('  ' + LABEL[k].padEnd(22) + String(r.parts[k].toFixed(1)).padStart(5) + ' / ' + WEIGHTS[k]));
  (r.gates || []).forEach(g => out.push((g.note ? 'NOTE · ' : g.hard ? 'RED FLAG · ' : 'CAP · ') + g.text));
  if (r.scenario) out.push('SCENARIO · if the linked, fresh and transferred wallets sold their ' + pct(r.scenario.share) + ' of float into today\'s liquidity, the price would fall about ' + Math.round(r.scenario.drop * 100) + '%');
  const multi = r.operators.filter(o => o.wallets.length > 1);
  if (multi.length) out.push('operators · ' + multi.map(o => o.id + ' ' + o.wallets.length + (o.level === 'pack' ? ' fresh wallets (pack)' : ' wallets') + ' ' + pct(o.share)).join(' · '));
}
if (r.guard) {
  out.push('');
  out.push('Guard · ' + (r.guard.pass ? (r.guard.pending ? 'PASS so far' : 'PASS') : 'HELD · ' + r.guard.reason));
  r.guard.checks.forEach(c => out.push('  ' + (c.ok === true ? '✓' : c.ok === false ? '✕' : '…') + ' ' + c.name.padEnd(18) + c.text));
}
console.log(out.join('\n'));
