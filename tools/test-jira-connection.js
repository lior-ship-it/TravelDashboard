#!/usr/bin/env node

/**
 * CLI Tool: Test Jira API Connection
 *
 * Usage:
 *   node tools/test-jira-connection.js
 *
 * Tests the Jira API credentials and connection
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { testConnection } = require('../backend/src/services/jira.service');

console.log('\n========================================');
console.log('  Testing Jira API Connection');
console.log('========================================');
console.log(`Host: ${process.env.JIRA_HOST}`);
console.log(`Email: ${process.env.JIRA_EMAIL}`);
console.log('========================================\n');

testConnection()
  .then(success => {
    if (success) {
      console.log('\n✅ Jira connection test passed!\n');
      process.exit(0);
    } else {
      console.log('\n❌ Jira connection test failed.\n');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
