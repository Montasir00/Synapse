#!/usr/bin/env node

/**
 * One-time migration: user_stats -> app_settings
 *
 * Usage:
 *   node scripts/migrate-user-stats-to-app-settings.js --dry-run
 *   node scripts/migrate-user-stats-to-app-settings.js --commit
 */

const admin = require('firebase-admin');

const args = process.argv.slice(2);
const isCommit = args.includes('--commit');
const isDryRun = args.includes('--dry-run') || !isCommit;

const projectArgIndex = args.indexOf('--project');
const projectIdFromArg = projectArgIndex >= 0 ? args[projectArgIndex + 1] : '';
const projectId =
  projectIdFromArg ||
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  '';

if (projectIdFromArg && !projectIdFromArg.startsWith('-')) {
  console.log(`[migration] Using project from CLI: ${projectIdFromArg}`);
}

const SOURCE_COLLECTION = 'user_stats';
const TARGET_COLLECTION = 'app_settings';
const BATCH_LIMIT = 450;

function parseTimestampValue(value) {
  if (!value) return 0;

  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeMonthlyBudget(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  return numeric;
}

async function commitWrites(db, writePayloads) {
  let batch = db.batch();
  let count = 0;

  for (const payload of writePayloads) {
    const ref = db.collection(TARGET_COLLECTION).doc(payload.uid);
    batch.set(
      ref,
      {
        uid: payload.uid,
        monthlyBudget: payload.monthlyBudget,
        migratedFrom: SOURCE_COLLECTION,
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    count += 1;

    if (count % BATCH_LIMIT === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (count % BATCH_LIMIT !== 0) {
    await batch.commit();
  }
}

async function run() {
  if (!projectId) {
    throw new Error(
      'Missing project id. Pass --project <projectId> or set GOOGLE_CLOUD_PROJECT/FIREBASE_PROJECT_ID.'
    );
  }

  if (!admin.apps.length) {
    admin.initializeApp({ projectId });
  }

  const db = admin.firestore();

  console.log(`[migration] Mode: ${isCommit ? 'commit' : 'dry-run'}`);
  console.log(`[migration] Project: ${projectId}`);
  console.log(`[migration] Reading from ${SOURCE_COLLECTION}...`);

  const sourceSnapshot = await db.collection(SOURCE_COLLECTION).get();

  const byUid = new Map();
  const stats = {
    totalSourceDocs: sourceSnapshot.size,
    skippedMissingUid: 0,
    normalizedBudgetCount: 0,
    duplicateUidCount: 0,
    selectedDocs: 0,
  };

  for (const sourceDoc of sourceSnapshot.docs) {
    const data = sourceDoc.data() || {};
    const uid = typeof data.uid === 'string' ? data.uid.trim() : '';

    if (!uid) {
      stats.skippedMissingUid += 1;
      continue;
    }

    const monthlyBudget = normalizeMonthlyBudget(data.monthlyBudget);
    if (monthlyBudget !== Number(data.monthlyBudget)) {
      stats.normalizedBudgetCount += 1;
    }

    const score = Math.max(
      parseTimestampValue(data.updatedAt),
      parseTimestampValue(data.createdAt)
    );

    const existing = byUid.get(uid);
    if (!existing) {
      byUid.set(uid, {
        uid,
        monthlyBudget,
        score,
        sourceDocId: sourceDoc.id,
      });
      continue;
    }

    stats.duplicateUidCount += 1;

    if (score > existing.score || (score === existing.score && sourceDoc.id > existing.sourceDocId)) {
      byUid.set(uid, {
        uid,
        monthlyBudget,
        score,
        sourceDocId: sourceDoc.id,
      });
    }
  }

  const writePayloads = Array.from(byUid.values()).map((item) => ({
    uid: item.uid,
    monthlyBudget: item.monthlyBudget,
  }));

  stats.selectedDocs = writePayloads.length;

  console.log('[migration] Summary');
  console.log(`  source docs: ${stats.totalSourceDocs}`);
  console.log(`  selected docs: ${stats.selectedDocs}`);
  console.log(`  skipped (missing uid): ${stats.skippedMissingUid}`);
  console.log(`  duplicates resolved: ${stats.duplicateUidCount}`);
  console.log(`  normalized monthlyBudget values: ${stats.normalizedBudgetCount}`);

  if (isDryRun) {
    console.log('[migration] Dry-run complete. No writes were performed.');
    return;
  }

  if (writePayloads.length === 0) {
    console.log('[migration] Nothing to migrate.');
    return;
  }

  console.log(`[migration] Writing ${writePayloads.length} documents to ${TARGET_COLLECTION}...`);
  await commitWrites(db, writePayloads);
  console.log('[migration] Commit complete.');
}

run().catch((error) => {
  console.error('[migration] Failed:', error);
  console.error('[migration] Hint: run `firebase login`, then pass --project <projectId>, or set ADC credentials.');
  process.exitCode = 1;
});
