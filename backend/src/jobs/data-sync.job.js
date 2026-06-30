const cron = require('node-cron');
const { fetchTenantClaims } = require('../services/jira.service');
const { setCachedData, clearCache, getCachedData } = require('../services/cache.service');
const { getDatabase } = require('../config/database');
const { detectChanges, recordChanges } = require('../services/change-tracking.service');

// List of all tenants to sync
const TENANTS = ['test-pc', 'ds', 'harel', 'fnx'];

/**
 * Refresh data for a single tenant
 */
async function refreshTenant(tenant) {
  const db = getDatabase();

  console.log(`\n[Sync Job] Refreshing tenant: ${tenant}`);

  const startTime = Date.now();
  let status = 'success';
  let errorMessage = null;
  let recordsFetched = 0;
  let syncId = null;

  try {
    // 1. Load current data from database (BEFORE clearing)
    // Query directly without TTL check — we need the previous snapshot regardless of age
    const oldRows = db.prepare(
      'SELECT raw_data FROM claims WHERE tenant = ? ORDER BY created_at DESC'
    ).all(tenant);
    const oldClaims = oldRows.map(r => JSON.parse(r.raw_data));

    // 2. Fetch fresh data from Jira
    const newClaims = await fetchTenantClaims(tenant);
    recordsFetched = newClaims.length;

    // 3. Create refresh_log entry FIRST to get sync_id
    const logStmt = db.prepare(`
      INSERT INTO refresh_log (tenant, records_fetched, status, error_message, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    const logResult = logStmt.run(tenant, recordsFetched, 'in_progress', null, new Date().toISOString());
    syncId = logResult.lastInsertRowid;

    // 4. Detect changes (compare old vs new)
    try {
      const changes = detectChanges(tenant, oldClaims, newClaims);

      // 5. Record changes to change_history table
      if (changes.length > 0) {
        recordChanges(changes, syncId);
        console.log(`[Sync Job] Recorded ${changes.length} field changes`);
      } else {
        console.log(`[Sync Job] No changes detected`);
      }
    } catch (changeError) {
      console.error(`[Sync Job] Warning: Change tracking failed but continuing sync:`, changeError.message);
    }

    // 6. Clear old cache and update with new data
    clearCache(tenant);
    setCachedData(tenant, newClaims);

    // 7. Update refresh_log to success
    db.prepare('UPDATE refresh_log SET status = ? WHERE id = ?').run('success', syncId);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Sync Job] ✓ Refreshed ${tenant}: ${recordsFetched} records in ${duration}s`);

  } catch (error) {
    status = 'error';
    errorMessage = error.message;

    // Update refresh_log to error if we created an entry
    if (syncId) {
      db.prepare('UPDATE refresh_log SET status = ?, error_message = ? WHERE id = ?')
        .run('error', errorMessage, syncId);
    } else {
      // Create error log entry if we didn't get to create one
      const stmt = db.prepare(`
        INSERT INTO refresh_log (tenant, records_fetched, status, error_message, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(tenant, recordsFetched, status, errorMessage, new Date().toISOString());
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[Sync Job] ✗ Failed to refresh ${tenant} after ${duration}s:`, error.message);
  }
}

/**
 * Refresh all tenants sequentially
 */
async function refreshAllTenants() {
  console.log('\n========================================');
  console.log('[Sync Job] Starting scheduled data refresh');
  console.log(`[Sync Job] Tenants: ${TENANTS.join(', ')}`);
  console.log('========================================');

  const startTime = Date.now();

  for (const tenant of TENANTS) {
    await refreshTenant(tenant);
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[Sync Job] ✓ Completed all refreshes in ${totalDuration}s\n`);
}

/**
 * Start the scheduled sync job
 * Runs every 4 hours: 0 star-slash-4 star star star (cron format)
 */
function startSyncJob() {
  // Run every 4 hours at minute 0
  const schedule = '0 */4 * * *';

  console.log(`\n✓ Scheduled data sync job: ${schedule} (every 4 hours)`);
  console.log(`  Tenants: ${TENANTS.join(', ')}\n`);

  cron.schedule(schedule, () => {
    refreshAllTenants().catch(error => {
      console.error('[Sync Job] Fatal error:', error);
    });
  });

  // Also run immediately on startup (optional, comment out if not desired)
  // setTimeout(() => {
  //   console.log('[Sync Job] Running initial sync on startup...');
  //   refreshAllTenants().catch(error => {
  //     console.error('[Sync Job] Initial sync failed:', error);
  //   });
  // }, 5000); // Wait 5 seconds after server start
}

module.exports = {
  startSyncJob,
  refreshAllTenants,
  refreshTenant
};
