#!/usr/bin/env node

/**
 * Fallback migration runner using Firebase CLI auth token from:
 *   ~/.config/configstore/firebase-tools.json
 *
 * Usage:
 *   node scripts/migrate-user-stats-via-firebase-cli-token.js --project <projectId> --dry-run
 *   node scripts/migrate-user-stats-via-firebase-cli-token.js --project <projectId> --commit
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');

const args = process.argv.slice(2);
const isCommit = args.includes('--commit');
const isDryRun = args.includes('--dry-run') || !isCommit;

const projectIndex = args.indexOf('--project');
const projectId = projectIndex >= 0 ? args[projectIndex + 1] : '';

if (!projectId || projectId.startsWith('-')) {
  console.error('[migration-token] Missing --project <projectId>');
  process.exit(1);
}

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');

function readCliConfig() {
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw);
}

async function getAccessToken(config) {
  const tokens = config.tokens || {};
  const now = Date.now();

  if (tokens.access_token && tokens.expires_at && tokens.expires_at > now + 60000) {
    return tokens.access_token;
  }

  if (!tokens.refresh_token) {
    throw new Error('No refresh_token found in firebase-tools config. Run `npx firebase-tools login --reauth`.');
  }

  const clientId = config.user?.azp || '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
    client_id: clientId,
  }).toString();

  const resp = await axios.post('https://oauth2.googleapis.com/token', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const fresh = resp.data;
  if (!fresh.access_token) {
    throw new Error('Failed to refresh access token from OAuth endpoint.');
  }

  return fresh.access_token;
}

function getFieldString(field) {
  if (!field) return '';
  if (typeof field.stringValue === 'string') return field.stringValue;
  return '';
}

function getFieldNumber(field) {
  if (!field) return 0;
  if (typeof field.integerValue === 'string') {
    const n = Number(field.integerValue);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof field.doubleValue === 'number') {
    return Number.isFinite(field.doubleValue) ? field.doubleValue : 0;
  }
  if (typeof field.stringValue === 'string') {
    const n = Number(field.stringValue);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function getTimestampScore(fields) {
  const updated = fields.updatedAt?.timestampValue || fields.updatedAt?.stringValue || '';
  const created = fields.createdAt?.timestampValue || fields.createdAt?.stringValue || '';
  const u = Date.parse(updated);
  const c = Date.parse(created);
  return Math.max(Number.isFinite(u) ? u : 0, Number.isFinite(c) ? c : 0);
}

function normalizeBudget(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

async function listAllUserStats(token) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/user_stats`;
  const docs = [];
  let pageToken = '';

  while (true) {
    const url = pageToken ? `${base}?pageSize=300&pageToken=${encodeURIComponent(pageToken)}` : `${base}?pageSize=300`;

    const resp = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const batch = resp.data.documents || [];
    docs.push(...batch);

    if (!resp.data.nextPageToken) break;
    pageToken = resp.data.nextPageToken;
  }

  return docs;
}

async function writeAppSetting(token, uid, monthlyBudget) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/app_settings/${encodeURIComponent(uid)}?updateMask.fieldPaths=uid&updateMask.fieldPaths=monthlyBudget&updateMask.fieldPaths=migratedFrom&updateMask.fieldPaths=migratedAt`;

  const body = {
    fields: {
      uid: { stringValue: uid },
      monthlyBudget: Number.isInteger(monthlyBudget)
        ? { integerValue: String(monthlyBudget) }
        : { doubleValue: monthlyBudget },
      migratedFrom: { stringValue: 'user_stats' },
      migratedAt: { timestampValue: new Date().toISOString() },
    },
  };

  await axios.patch(url, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

async function run() {
  console.log(`[migration-token] Mode: ${isCommit ? 'commit' : 'dry-run'}`);
  console.log(`[migration-token] Project: ${projectId}`);

  if (!fs.existsSync(configPath)) {
    throw new Error(`firebase-tools config not found at ${configPath}`);
  }

  const config = readCliConfig();
  const token = await getAccessToken(config);

  const sourceDocs = await listAllUserStats(token);

  const byUid = new Map();
  const stats = {
    totalSourceDocs: sourceDocs.length,
    skippedMissingUid: 0,
    duplicateUidCount: 0,
    normalizedBudgetCount: 0,
    selectedDocs: 0,
  };

  for (const d of sourceDocs) {
    const fields = d.fields || {};
    const uid = getFieldString(fields.uid).trim();

    if (!uid) {
      stats.skippedMissingUid += 1;
      continue;
    }

    const rawBudget = getFieldNumber(fields.monthlyBudget);
    const monthlyBudget = normalizeBudget(rawBudget);
    if (monthlyBudget !== rawBudget) {
      stats.normalizedBudgetCount += 1;
    }

    const score = getTimestampScore(fields);
    const existing = byUid.get(uid);

    if (!existing) {
      byUid.set(uid, { uid, monthlyBudget, score, docName: d.name || '' });
      continue;
    }

    stats.duplicateUidCount += 1;

    if (score > existing.score || (score === existing.score && (d.name || '') > existing.docName)) {
      byUid.set(uid, { uid, monthlyBudget, score, docName: d.name || '' });
    }
  }

  const payloads = Array.from(byUid.values()).map((x) => ({ uid: x.uid, monthlyBudget: x.monthlyBudget }));
  stats.selectedDocs = payloads.length;

  console.log('[migration-token] Summary');
  console.log(`  source docs: ${stats.totalSourceDocs}`);
  console.log(`  selected docs: ${stats.selectedDocs}`);
  console.log(`  skipped (missing uid): ${stats.skippedMissingUid}`);
  console.log(`  duplicates resolved: ${stats.duplicateUidCount}`);
  console.log(`  normalized monthlyBudget values: ${stats.normalizedBudgetCount}`);

  if (isDryRun) {
    console.log('[migration-token] Dry-run complete. No writes were performed.');
    return;
  }

  let written = 0;
  for (const p of payloads) {
    await writeAppSetting(token, p.uid, p.monthlyBudget);
    written += 1;
  }

  console.log(`[migration-token] Commit complete. Wrote ${written} app_settings documents.`);
}

run().catch((err) => {
  console.error('[migration-token] Failed:', err?.response?.data || err.message || err);
  process.exitCode = 1;
});
