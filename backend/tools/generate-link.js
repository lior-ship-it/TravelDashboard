#!/usr/bin/env node

/**
 * Generate Tenant Access Link
 *
 * Creates a secure, expiring access link for a tenant to view their dashboard
 * Usage: node tools/generate-link.js <tenant-name>
 */

require('dotenv').config();
const crypto = require('crypto');
const Database = require('better-sqlite3');

const TENANT_NAME = process.argv[2];
const TOKEN_EXPIRY_DAYS = 90;
const DATABASE_PATH = process.env.DATABASE_PATH || './data/bluespine.db';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

if (!TENANT_NAME) {
  console.error('\n❌ Usage: node tools/generate-link.js <tenant-name>\n');
  console.error('Example: node tools/generate-link.js harel\n');
  console.error('Available tenants: test-pc, ds, harel, fnx\n');
  process.exit(1);
}

try {
  // Open database
  const db = new Database(DATABASE_PATH);

  // Check if tenant already has a link
  const existing = db.prepare('SELECT * FROM tenant_links WHERE tenant = ?').get(TENANT_NAME);

  if (existing) {
    const expiresAt = new Date(existing.expires_at);
    const now = new Date();

    if (expiresAt > now) {
      console.log('\n⚠️  Tenant already has an active link:\n');
      console.log(`   Tenant: ${existing.tenant}`);
      console.log(`   Expires: ${expiresAt.toISOString()}`);
      console.log(`   Days remaining: ${Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))}`);
      console.log(`\n   🔗 ${BASE_URL}/${existing.tenant}/${existing.access_token}\n`);

      console.log('Do you want to generate a new link? This will revoke the old one.');
      console.log('Run: node tools/generate-link.js --force ' + TENANT_NAME + '\n');
      process.exit(0);
    } else {
      // Expired link, delete it
      db.prepare('DELETE FROM tenant_links WHERE tenant = ?').run(TENANT_NAME);
      console.log('\n♻️  Removed expired link, generating new one...\n');
    }
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');

  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

  // Insert into database
  const stmt = db.prepare(`
    INSERT INTO tenant_links (tenant, access_token, expires_at)
    VALUES (?, ?, ?)
  `);

  stmt.run(TENANT_NAME, token, expiresAt.toISOString());

  // Success!
  console.log('\n✅ Tenant access link generated successfully!\n');
  console.log('========================================');
  console.log(`   Tenant: ${TENANT_NAME}`);
  console.log(`   Expires: ${expiresAt.toISOString()}`);
  console.log(`   Valid for: ${TOKEN_EXPIRY_DAYS} days`);
  console.log('========================================\n');
  console.log('🔗 Share this link with the tenant:\n');
  console.log(`   ${BASE_URL}/${TENANT_NAME}/${token}\n`);
  console.log('💡 This link is secure and specific to this tenant.');
  console.log('   Data will refresh automatically every 4 hours.\n');

  db.close();

} catch (error) {
  console.error('\n❌ Error generating link:\n');
  console.error(`   ${error.message}\n`);

  if (error.code === 'SQLITE_CANTOPEN') {
    console.error('💡 Make sure the server has been started at least once to initialize the database.\n');
  }

  process.exit(1);
}
