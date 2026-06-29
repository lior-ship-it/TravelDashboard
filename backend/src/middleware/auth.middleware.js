const { validateToken } = require('../services/link.service');

/**
 * Middleware to validate tenant access tokens
 * Expects URL params: tenant and token
 */
function validateTenantToken(req, res, next) {
  const { tenant, token } = req.params;

  if (!tenant || !token) {
    return res.status(400).json({
      error: 'Missing tenant or token parameter'
    });
  }

  const validatedTenant = validateToken(tenant, token);

  if (!validatedTenant) {
    return res.status(401).json({
      error: 'Invalid or expired access token',
      message: 'Please contact your administrator for a new link.'
    });
  }

  // Attach tenant to request for use in route handlers
  req.tenant = validatedTenant;

  next();
}

/**
 * Middleware to validate admin authorization
 * Expects Authorization: Bearer <ADMIN_TOKEN> header
 */
function validateAdminToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Missing or invalid Authorization header',
      message: 'Expected: Authorization: Bearer <ADMIN_TOKEN>'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({
      error: 'Invalid admin token'
    });
  }

  next();
}

module.exports = {
  validateTenantToken,
  validateAdminToken
};
