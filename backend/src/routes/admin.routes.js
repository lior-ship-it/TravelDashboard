const express = require('express');
const { validateAdminToken } = require('../middleware/auth.middleware');
const { generateTenantLink, getAllLinks, revokeLink } = require('../services/link.service');
const { clearCache, getCacheStats, getCachedData, setCachedData } = require('../services/cache.service');
const { fetchTenantClaims } = require('../services/jira.service');

const router = express.Router();

/**
 * Generate a new tenant access link
 * POST /api/admin/generate-link
 * Body: { tenant: "harel" }
 */
router.post('/generate-link', validateAdminToken, (req, res, next) => {
  try {
    const { tenant } = req.body;

    if (!tenant) {
      return res.status(400).json({ error: 'Missing tenant parameter' });
    }

    const link = generateTenantLink(tenant);

    res.json(link);
  } catch (error) {
    next(error);
  }
});

/**
 * Get all tenant links
 * GET /api/admin/links
 */
router.get('/links', validateAdminToken, (req, res, next) => {
  try {
    const links = getAllLinks();
    res.json({ links });
  } catch (error) {
    next(error);
  }
});

/**
 * Revoke a tenant link
 * DELETE /api/admin/link/:tenant
 */
router.delete('/link/:tenant', validateAdminToken, (req, res, next) => {
  try {
    const { tenant } = req.params;
    const revoked = revokeLink(tenant);

    if (revoked) {
      res.json({ success: true, message: `Link revoked for tenant: ${tenant}` });
    } else {
      res.status(404).json({ error: 'Tenant link not found' });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Manually refresh tenant data
 * POST /api/admin/refresh/:tenant
 */
router.post('/refresh/:tenant', validateAdminToken, async (req, res, next) => {
  try {
    const { tenant } = req.params;

    console.log(`Admin: Manual refresh requested for tenant: ${tenant}`);

    // Use the refreshTenant function which includes change tracking
    const { refreshTenant } = require('../jobs/data-sync.job');
    await refreshTenant(tenant);

    // Get the updated data
    const data = getCachedData(tenant);

    res.json({
      success: true,
      tenant,
      recordsFetched: data ? data.claims.length : 0,
      lastFetched: data ? data.lastFetched : new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Get cache statistics
 * GET /api/admin/cache-stats
 */
router.get('/cache-stats', validateAdminToken, (req, res, next) => {
  try {
    const stats = getCacheStats();
    res.json({ stats });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
