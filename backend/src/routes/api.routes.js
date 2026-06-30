const express = require('express');
const { validateTenantToken } = require('../middleware/auth.middleware');
const { getCachedData, setCachedData } = require('../services/cache.service');
const { fetchTenantClaims } = require('../services/jira.service');
const { getRecentChanges } = require('../services/change-tracking.service');

const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Get recent changes for a tenant
 * Must be defined BEFORE the general /data/:tenant/:token route
 */
router.get('/data/:tenant/:token/changes', validateTenantToken, (req, res) => {
  try {
    const { tenant } = req.params;
    const days = parseInt(req.query.days || '30', 10);

    const changes = getRecentChanges(tenant, days);

    res.json({
      success: true,
      changes,
      count: changes.length
    });

  } catch (error) {
    console.error('Error fetching changes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch change history'
    });
  }
});

/**
 * Get tenant data
 * - Checks cache first
 * - Falls back to Jira API if cache is stale
 */
router.get('/data/:tenant/:token', validateTenantToken, async (req, res, next) => {
  try {
    const tenant = req.tenant;

    console.log(`API: Fetching data for tenant: ${tenant}`);

    // Try cache first
    let data = getCachedData(tenant);

    if (!data) {
      // Cache miss or stale - fetch from Jira
      console.log(`  Cache miss - fetching from Jira...`);

      const claims = await fetchTenantClaims(tenant);
      data = setCachedData(tenant, claims);
    }

    res.json(data);

  } catch (error) {
    next(error);
  }
});

module.exports = router;
