#!/usr/bin/env node

/**
 * CLI Tool: Generate Tenant Access Link
 *
 * Usage:
 *   node tools/generate-link.js <tenant-name>
 *
 * Example:
 *   node tools/generate-link.js harel
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { initDatabase } = require('../backend/src/config/database');
const { generateTenantLink } = require('../backend/src/services/link.service');

const tenant = process.argv[2];

if (!tenant) {
  console.error('❌ Error: Missing tenant name\n');
  console.log('Usage: node tools/generate-link.js <tenant-name>\n');
  console.log('Available tenants: test-pc, ds, harel, fnx\n');
  process.exit(1);
}

// Initialize database
initDatabase();

try {
  const link = generateTenantLink(tenant);

  console.log('\n========================================');
  console.log('  Tenant Access Link Generated');
  console.log('========================================');
  console.log(`Tenant:     ${link.tenant}`);
  console.log(`URL:        ${link.url}`);
  console.log(`Expires:    ${new Date(link.expiresAt).toLocaleDateString()}`);
  console.log('========================================\n');

  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
