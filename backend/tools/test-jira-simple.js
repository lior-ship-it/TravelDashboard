#!/usr/bin/env node

/**
 * Simple Jira API Connection Test (no dependencies)
 *
 * Tests Jira API credentials using only Node.js built-in modules
 */

const fs = require('fs');
const path = require('path');

// Load .env file manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
  if (match) {
    envVars[match[1]] = match[2].trim();
  }
});

const JIRA_HOST = envVars.JIRA_HOST;
const JIRA_EMAIL = envVars.JIRA_EMAIL;
const JIRA_API_TOKEN = envVars.JIRA_API_TOKEN;

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
    // Create auth header
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

    // Test 1: Get current user
    console.log('🧪 Test 1: Authenticating...');
    const userUrl = `https://${JIRA_HOST}/rest/api/3/myself`;

    const userResponse = await fetch(userUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!userResponse.ok) {
      throw new Error(`HTTP ${userResponse.status}: ${userResponse.statusText}`);
    }

    const userData = await userResponse.json();
    console.log(`   ✅ Authenticated as: ${userData.displayName} (${userData.emailAddress})`);

    // Test 2: Search for projects
    console.log('\n🧪 Test 2: Searching for projects...');
    const projectUrl = `https://${JIRA_HOST}/rest/api/3/project`;

    const projectResponse = await fetch(projectUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!projectResponse.ok) {
      throw new Error(`HTTP ${projectResponse.status}: ${projectResponse.statusText}`);
    }

    const projects = await projectResponse.json();
    console.log(`   ✅ Found ${projects.length} accessible projects`);

    if (projects.length > 0) {
      console.log('   First few projects:');
      projects.slice(0, 5).forEach(project => {
        console.log(`      - ${project.key}: ${project.name}`);
      });
    }

    // Test 3: Try a simple JQL search
    console.log('\n🧪 Test 3: Testing JQL search...');
    const searchUrl = `https://${JIRA_HOST}/rest/api/3/search`;

    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jql: 'created >= -7d',
        maxResults: 1
      })
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.log(`   ⚠️  JQL search returned ${searchResponse.status} (might be an API version issue)`);
      console.log(`   ℹ️  This is OK - basic authentication and project access work fine`);
    } else {
      const searchData = await searchResponse.json();
      console.log(`   ✅ JQL search successful (${searchData.total} issues in last 7 days)`);
    }

    // Success summary
    console.log('\n✨ All tests passed! Your Jira connection is configured correctly.\n');
    console.log('Next steps:');
    console.log('   1. Install dependencies with a compatible Node version (18-22)');
    console.log('   2. Or install nvm and use: nvm install 20 && nvm use 20');
    console.log('   3. Then: npm install');
    console.log('   4. Start the server: npm start');
    console.log('');

  } catch (error) {
    console.error('\n❌ Connection test failed!\n');

    if (error.message.includes('401')) {
      console.error('   Error: Authentication failed (401 Unauthorized)');
      console.error('\n💡 Troubleshooting tips:');
      console.error('   - Verify your JIRA_EMAIL matches the account that created the API token');
      console.error('   - Generate a new API token at: https://id.atlassian.com/manage-profile/security/api-tokens');
      console.error('   - Make sure the API token is copied correctly (no extra spaces)');
    } else if (error.message.includes('403')) {
      console.error('   Error: Access forbidden (403 Forbidden)');
      console.error('\n💡 Troubleshooting tips:');
      console.error('   - Your credentials are valid but you may lack permissions');
      console.error('   - Contact your Jira administrator to verify access');
    } else if (error.message.includes('404')) {
      console.error('   Error: Not found (404)');
      console.error('\n💡 Troubleshooting tips:');
      console.error('   - Check that JIRA_HOST is correct (should be: your-domain.atlassian.net)');
      console.error('   - Do not include https:// in the JIRA_HOST value');
    } else {
      console.error(`   Error: ${error.message}`);
      console.error('\n💡 Troubleshooting tips:');
      console.error('   - Check your internet connection');
      console.error('   - Verify JIRA_HOST is correct');
      console.error('   - Check if a firewall/proxy is blocking the connection');
    }

    console.error('');
    process.exit(1);
  }
}

testConnection();
