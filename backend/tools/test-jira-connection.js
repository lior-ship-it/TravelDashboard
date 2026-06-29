#!/usr/bin/env node

/**
 * Test Jira API Connection
 *
 * This script tests the Jira API credentials configured in .env
 * and verifies that the connection is working properly.
 */

require('dotenv').config();
const axios = require('axios');

const JIRA_HOST = process.env.JIRA_HOST;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

async function testConnection() {
  console.log('\n🔍 Testing Jira API Connection...\n');

  // Validate environment variables
  if (!JIRA_HOST || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    console.error('❌ Missing required environment variables:');
    if (!JIRA_HOST) console.error('   - JIRA_HOST');
    if (!JIRA_EMAIL) console.error('   - JIRA_EMAIL');
    if (!JIRA_API_TOKEN) console.error('   - JIRA_API_TOKEN');
    console.error('\nPlease check your .env file.\n');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   Host:  ${JIRA_HOST}`);
  console.log(`   Email: ${JIRA_EMAIL}`);
  console.log(`   Token: ${JIRA_API_TOKEN.substring(0, 20)}...`);
  console.log('');

  try {
    // Test 1: Get current user
    console.log('🧪 Test 1: Authenticating...');
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

    const userResponse = await axios.get(`https://${JIRA_HOST}/rest/api/3/myself`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    console.log(`   ✅ Authenticated as: ${userResponse.data.displayName} (${userResponse.data.emailAddress})`);

    // Test 2: Search for a project
    console.log('\n🧪 Test 2: Searching for projects...');
    const projectResponse = await axios.get(`https://${JIRA_HOST}/rest/api/3/project`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    console.log(`   ✅ Found ${projectResponse.data.length} accessible projects`);
    if (projectResponse.data.length > 0) {
      console.log('   First few projects:');
      projectResponse.data.slice(0, 5).forEach(project => {
        console.log(`      - ${project.key}: ${project.name}`);
      });
    }

    // Test 3: Try a simple JQL search
    console.log('\n🧪 Test 3: Testing JQL search...');
    const searchResponse = await axios.get(`https://${JIRA_HOST}/rest/api/3/search`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      params: {
        jql: 'created >= -7d',
        maxResults: 1
      }
    });

    console.log(`   ✅ JQL search successful (${searchResponse.data.total} issues in last 7 days)`);

    // Success summary
    console.log('\n✨ All tests passed! Your Jira connection is configured correctly.\n');
    console.log('Next steps:');
    console.log('   1. Start the server: npm start');
    console.log('   2. Generate a tenant link: node tools/generate-link.js <tenant-name>');
    console.log('');

  } catch (error) {
    console.error('\n❌ Connection test failed!\n');

    if (error.response) {
      console.error(`   Status: ${error.response.status} ${error.response.statusText}`);
      console.error(`   Error: ${error.response.data.errorMessages?.[0] || error.response.data.message || 'Unknown error'}`);

      if (error.response.status === 401) {
        console.error('\n💡 Troubleshooting tips:');
        console.error('   - Verify your JIRA_EMAIL matches the account that created the API token');
        console.error('   - Generate a new API token at: https://id.atlassian.com/manage-profile/security/api-tokens');
        console.error('   - Make sure the API token is copied correctly (no extra spaces)');
      } else if (error.response.status === 403) {
        console.error('\n💡 Troubleshooting tips:');
        console.error('   - Your credentials are valid but you may lack permissions');
        console.error('   - Contact your Jira administrator to verify access');
      } else if (error.response.status === 404) {
        console.error('\n💡 Troubleshooting tips:');
        console.error('   - Check that JIRA_HOST is correct (should be: your-domain.atlassian.net)');
        console.error('   - Do not include https:// in the JIRA_HOST value');
      }
    } else if (error.request) {
      console.error('   Network error: Could not reach Jira server');
      console.error('\n💡 Troubleshooting tips:');
      console.error('   - Check your internet connection');
      console.error('   - Verify JIRA_HOST is correct');
      console.error('   - Check if a firewall/proxy is blocking the connection');
    } else {
      console.error(`   Error: ${error.message}`);
    }

    console.error('');
    process.exit(1);
  }
}

testConnection();
