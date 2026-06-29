const cron = require('node-cron');
const { fetchTenantClaims } = require('../services/jira.service');
const { setCachedData, clearCache } = require('../services/cache.service');
const { getDatabase } = require('../config/database');

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

  try {
    // Clear old cache
    clearCache(tenant);

    // Fetch fresh data from Jira
    const claims = await fetchTenantClaims(tenant);
    recordsFetched = claims.length;

    // Update cache
    setCachedData(tenant, claims);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Sync Job] ✓ Refreshed ${tenant}: ${recordsFetched} records in ${duration}s`);

  } catch (error) {
    status = 'error';
    errorMessage = error.message;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[Sync Job] ✗ Failed to refresh ${tenant} after ${duration}s:`, error.message);
  }

  // Log to refresh_log table
  const stmt = db.prepare(`
    INSERT INTO refresh_log (tenant, records_fetched, status, error_message, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(
    tenant,
    recordsFetched,
    status,
    errorMessage,
    new Date().toISOString()
  );
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
