const crypto = require('crypto');
const { getDatabase } = require('../config/database');

const TOKEN_EXPIRY_DAYS = 90;

/**
 * Generate a secure tenant access link
 */
function generateTenantLink(tenant) {
  const db = getDatabase();

  // Generate cryptographically secure token (64 characters)
  const token = crypto.randomBytes(32).toString('hex');

  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

  // Check if tenant already has a link
  const existing = db.prepare('SELECT id, access_token FROM tenant_links WHERE tenant = ?').get(tenant);

  if (existing) {
    // Update existing link
    const stmt = db.prepare(`
      UPDATE tenant_links
      SET access_token = ?, expires_at = ?, last_accessed = NULL
      WHERE tenant = ?
    `);
    stmt.run(token, expiresAt.toISOString(), tenant);

    console.log(`✓ Updated link for tenant: ${tenant}`);
  } else {
    // Create new link
    const stmt = db.prepare(`
      INSERT INTO tenant_links (tenant, access_token, expires_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(tenant, token, expiresAt.toISOString());

    console.log(`✓ Created new link for tenant: ${tenant}`);
  }

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  return {
    tenant,
    token,
    url: `${baseUrl}/${tenant}/${token}`,
    expiresAt: expiresAt.toISOString()
  };
}

/**
 * Validate a tenant access token
 * Returns tenant name if valid, null if invalid/expired
 */
function validateToken(tenant, token) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT id, tenant, expires_at, last_accessed
    FROM tenant_links
    WHERE tenant = ? AND access_token = ?
  `);

  const record = stmt.get(tenant, token);

  if (!record) {
    console.log(`✗ Invalid token for tenant: ${tenant}`);
    return null;
  }

  const expiresAt = new Date(record.expires_at);
  const now = new Date();

  if (now > expiresAt) {
    console.log(`✗ Expired token for tenant: ${tenant} (expired: ${record.expires_at})`);
    return null;
  }

  // Update last accessed timestamp
  const updateStmt = db.prepare(`
    UPDATE tenant_links
    SET last_accessed = ?
    WHERE id = ?
  `);
  updateStmt.run(now.toISOString(), record.id);

  console.log(`✓ Valid token for tenant: ${tenant}`);

  return tenant;
}

/**
 * Get all tenant links
 */
function getAllLinks() {
  const db = getDatabase();

  const links = db.prepare(`
    SELECT tenant, access_token, expires_at, last_accessed, created_at
    FROM tenant_links
    ORDER BY tenant
  `).all();

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  return links.map(link => ({
    tenant: link.tenant,
    url: `${baseUrl}/${link.tenant}/${link.access_token}`,
    expiresAt: link.expires_at,
    lastAccessed: link.last_accessed,
    createdAt: link.created_at,
    isExpired: new Date(link.expires_at) < new Date()
  }));
}

/**
 * Revoke a tenant link
 */
function revokeLink(tenant) {
  const db = getDatabase();

  const stmt = db.prepare('DELETE FROM tenant_links WHERE tenant = ?');
  const result = stmt.run(tenant);

  if (result.changes > 0) {
    console.log(`✓ Revoked link for tenant: ${tenant}`);
    return true;
  } else {
    console.log(`✗ No link found for tenant: ${tenant}`);
    return false;
  }
}

module.exports = {
  generateTenantLink,
  validateToken,
  getAllLinks,
  revokeLink,
  TOKEN_EXPIRY_DAYS
};
