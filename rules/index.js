'use strict';
/* QuantumOrb's open rules: the part of the scanner that turns what it read into a verdict. */
const { score, part, impact, WEIGHTS, SCALE } = require('./score');
const { operators } = require('./operators');
const { historyCheck, slot0Check, devCheck, verdict, guard } = require('./guard');
const { scanVerdict } = require('./verdict');
const limits = require('./limits');

module.exports = { scanVerdict, score, part, impact, WEIGHTS, SCALE, operators, guard, historyCheck, slot0Check, devCheck, verdict, limits };
