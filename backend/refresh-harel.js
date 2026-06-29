require('dotenv').config();
const { fetchTenantClaims } = require('./src/services/jira.service');
const { setCachedData } = require('./src/services/cache.service');

async function refresh() {
  console.log('Fetching claims for harel...');
  const claims = await fetchTenantClaims('harel');
  console.log(`Fetched ${claims.length} claims`);
  setCachedData('harel', claims);
  console.log('Done!');
}

refresh().catch(console.error);
