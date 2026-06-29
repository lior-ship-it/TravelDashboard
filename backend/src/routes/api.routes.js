const express = require('express');
const { validateTenantToken } = require('../middleware/auth.middleware');
const { getCachedData, setCachedData } = require('../services/cache.service');
const { fetchTenantClaims } = require('../services/jira.service');

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
