/**
 * Rebuild admin test sales from the Kaggle bakery dataset.
 * Run: node js/generate-fake-admin-sales.js
 */
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const script = path.join(__dirname, 'generate-fake-admin-sales.py');
const result = spawnSync('python', [script], { stdio: 'inherit' });
process.exit(result.status == null ? 1 : result.status);
