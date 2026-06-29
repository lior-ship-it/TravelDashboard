const { getDatabase } = require('../config/database');

const CACHE_TTL_HOURS = 4; // Data is fresh for 4 hours

/**
 * Get cached data for a tenant
 * Returns null if cache is stale or doesn't exist
 */
function getCachedData(tenant) {
  const db = getDatabase();

  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - CACHE_TTL_HOURS);

  const stmt = db.prepare(`
    SELECT issue_key, raw_data, fetched_at
    FROM claims
    WHERE tenant = ? AND fetched_at >= ?
    ORDER BY created_at DESC
  `);

  const rows = stmt.all(tenant, cutoffTime.toISOString());

  if (rows.length === 0) {
    console.log(`No cached data for tenant: ${tenant}`);
    return null;
  }

  console.log(`✓ Using cached data for ${tenant} (${rows.length} records, age: ${getAgeMinutes(rows[0].fetched_at)} minutes)`);

  return {
    claims: rows.map(row => JSON.parse(row.raw_data)),
    lastFetched: rows[0].fetched_at,
    fromCache: true
  };
}

/**
 * Store claims data in cache
 */
function setCachedData(tenant, claims) {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.transaction(() => {
    // Delete old data for this tenant
    const deleteStmt = db.prepare('DELETE FROM claims WHERE tenant = ?');
    deleteStmt.run(tenant);

    // Insert new data
    const insertStmt = db.prepare(`
      INSERT INTO claims (issue_key, tenant, raw_data, fetched_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const claim of claims) {
      const issueKey = claim['Issue key'] || claim.issueKey || 'UNKNOWN';
      const createdAt = claim['Created'] || claim.created || now;

      insertStmt.run(
        issueKey,
        tenant,
        JSON.stringify(claim),
        now,
        createdAt
      );
    }
  })();

  console.log(`✓ Cached ${claims.length} claims for tenant: ${tenant}`);

  return {
    claims,
    lastFetched: now,
    fromCache: false
  };
}

/**
 * Check if cached data exists and is fresh
 */
function isCacheFresh(tenant) {
  const db = getDatabase();

  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - CACHE_TTL_HOURS);

  const stmt = db.prepare(`
    SELECT COUNT(*) as count, MAX(fetched_at) as last_fetch
    FROM claims
    WHERE tenant = ? AND fetched_at >= ?
  `);

  const result = stmt.get(tenant, cutoffTime.toISOString());

  return result.count > 0;
}

/**
 * Get age of cached data in minutes
 */
function getAgeMinutes(fetchedAt) {
  const now = new Date();
  const fetched = new Date(fetchedAt);
  return Math.round((now - fetched) / 1000 / 60);
}

/**
 * Clear all cached data for a tenant
 */
function clearCache(tenant) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM claims WHERE tenant = ?');
  const result = stmt.run(tenant);

  console.log(`✓ Cleared cache for tenant: ${tenant} (${result.changes} records deleted)`);

  return result.changes;
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  const db = getDatabase();

  const stats = db.prepare(`
    SELECT
      tenant,
      COUNT(*) as record_count,
      MAX(fetched_at) as last_fetch,
      MIN(created_at) as oldest_claim,
      MAX(created_at) as newest_claim
    FROM claims
    GROUP BY tenant
  `).all();

  return stats.map(stat => ({
    ...stat,
    age_minutes: getAgeMinutes(stat.last_fetch),
    is_fresh: getAgeMinutes(stat.last_fetch) < (CACHE_TTL_HOURS * 60)
  }));
}

module.exports = {
  getCachedData,
  setCachedData,
  isCacheFresh,
  clearCache,
  getCacheStats,
  CACHE_TTL_HOURS
};
