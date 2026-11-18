// Evaluates the REAL vision pipeline (POST /api/vision, Gemini) against hand-labeled photos.
//
// Usage:
//   node scripts/eval-vision.mjs <folder> <merchant_email> <merchant_password> [baseUrl]
//
// <folder> contains the photos plus a truth.json written BY HAND before running the AI:
//   {
//     "vitrina1.jpg": { "isFood": true,  "difficulty": "easy", "items": { "Concha de vainilla": 3 } },
//     "oficina.jpg":  { "isFood": false, "difficulty": "hard", "items": {}, "note": "no food" },
//     "apilado.jpg":  { "isFood": true,  "difficulty": "hard", "items": { "Pan rustico": 4 }, "note": "stacked" }
//   }
// Item names must match the product names in the merchant's catalog exactly.
// Optional fields per photo:
//   "items": { "Name": null }   -> only presence is checked (use when the count is ambiguous)
//   "optional": ["Name", ...]   -> catalog products that may appear without counting as false positives
// Counts are accepted within +/- 1 piece. isFood=true with empty "items" means "no catalog match expected".
// Output: a table in the console and <folder>/results.csv.
//
// Free-tier friendly options (environment variables):
//   EVAL_DELAY_MS=15000   pause between photos (default 15000)
//   EVAL_OFFSET=0         first photo to run (0-based)
//   EVAL_LIMIT=8          how many photos to run in this batch (default all)
// A partial batch writes results_<from>-<to>.csv so batches do not overwrite each other.
// The run stops early on a 429 (quota exhausted) instead of burning more calls.

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

const [folder, email, password, baseUrl = 'http://localhost:3000'] = process.argv.slice(2);
if (!folder || !email || !password) {
  console.error('Usage: node scripts/eval-vision.mjs <folder> <email> <password> [baseUrl]');
  process.exit(1);
}

const truth = JSON.parse(fs.readFileSync(path.join(folder, 'truth.json'), 'utf8'));
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
if (authError) {
  console.error('Login failed:', authError.message);
  process.exit(1);
}
const token = auth.session.access_token;

const mimeOf = (f) => (f.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
const rows = [];

const delayMs = Number(process.env.EVAL_DELAY_MS || 15000);
const offset = Number(process.env.EVAL_OFFSET || 0);
const allEntries = Object.entries(truth);
const limit = Number(process.env.EVAL_LIMIT || allEntries.length);
const batch = allEntries.slice(offset, offset + limit);
let stoppedByQuota = false;

for (const [file, expected] of batch) {
  if (rows.length > 0) await new Promise((r) => setTimeout(r, delayMs));
  const bytes = fs.readFileSync(path.join(folder, file));
  const imageUrl = `data:${mimeOf(file)};base64,${bytes.toString('base64')}`;

  const started = Date.now();
  let json = {};
  let status = 0;
  try {
    const res = await fetch(`${baseUrl}/api/vision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ imageUrl }),
    });
    status = res.status;
    json = await res.json();
  } catch (err) {
    json = { success: false, user_message: String(err) };
  }
  const latencyMs = Date.now() - started;
  if (status === 429) {
    console.error(`Quota exhausted at ${file}. Stopping; resume with EVAL_OFFSET=${offset + rows.length}.`);
    stoppedByQuota = true;
    break;
  }

  const noMatch = json.error_code === 'NO_CATALOG_MATCH';
  const gotIsFood = json.success || noMatch ? true : json.is_food === false ? false : null;
  const gotItems = {};
  for (const it of json.data?.items || []) gotItems[it.name] = (gotItems[it.name] || 0) + it.quantity;
  const unmatched = (json.data?.unmatched || json.unmatched || []).map((u) => `${u.description} x${u.quantity}`).join('; ');

  let correct;
  const errors = [];
  if (gotIsFood === null) {
    correct = false;
    errors.push(`api_error(${status})`);
  } else if (gotIsFood !== expected.isFood) {
    correct = false;
    errors.push(expected.isFood ? 'rejected_valid_food' : 'accepted_non_food');
  } else if (!expected.isFood) {
    correct = true;
  } else {
    for (const [name, qty] of Object.entries(expected.items || {})) {
      if (!(name in gotItems)) errors.push(`missed:${name}`);
      else if (qty !== null && Math.abs(gotItems[name] - qty) > 1) errors.push(`count:${name} expected ${qty} got ${gotItems[name]}`);
    }
    for (const name of Object.keys(gotItems)) {
      if (!(name in (expected.items || {})) && !(expected.optional || []).includes(name)) errors.push(`false_positive:${name}`);
    }
    correct = errors.length === 0;
  }

  rows.push({
    file,
    difficulty: expected.difficulty || '',
    expected_is_food: expected.isFood,
    got_is_food: gotIsFood,
    expected_items: JSON.stringify(expected.items || {}),
    got_items: JSON.stringify(gotItems),
    unmatched,
    model: json.data?.model ?? '',
    status: noMatch ? 'no_match' : (json.data?.status ?? (json.success ? '' : 'rejected')),
    confidence: json.data?.overall_confidence ?? '',
    correct,
    errors: errors.join(' | '),
    latency_ms: latencyMs,
    note: expected.note || '',
  });
  console.log(`${correct ? 'OK  ' : 'FAIL'} ${file} (${expected.difficulty || '-'}) ${errors.join(' | ')}`);
}

const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;
if (rows.length === 0) {
  console.log('No results to write.');
  process.exit(1);
}
const header = Object.keys(rows[0]);
const outName = batch.length === allEntries.length ? 'results.csv' : `results_${offset}-${offset + rows.length}.csv`;
fs.writeFileSync(
  path.join(folder, outName),
  [header.join(','), ...rows.map((r) => header.map((h) => csvCell(r[h])).join(','))].join('\n')
);

const total = rows.length;
const ok = rows.filter((r) => r.correct).length;
const hard = rows.filter((r) => r.difficulty === 'hard');
console.log(`\nResolved correctly: ${ok}/${total} (${Math.round((ok / total) * 100)}%)`);
console.log(`Hard cases: ${hard.filter((r) => r.correct).length}/${hard.length}`);
console.log(`Results written to ${path.join(folder, outName)}${stoppedByQuota ? ' (stopped early: quota)' : ''}`);
