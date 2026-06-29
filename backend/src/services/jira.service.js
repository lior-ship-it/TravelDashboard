const { createJiraClient } = require('../config/jira');

// Field mapping from original HTML dashboard
const FIELD_MAP = {
  summary:           ['Summary'],
  issueKey:          ['Issue key'],
  status:            ['Status'],
  created:           ['Custom field (Created-At)', 'Created-At', 'Created'],
  closed:            ['Custom field (Closed-At)', 'Closed-At', 'Closed'],
  resolved:          ['Resolved'],
  updated:           ['Updated', 'Custom field (Updated-At)', 'Updated-At'],
  allowed:           ['Total Allowed', 'Custom field (Total Allowed)', 'Allowed', 'Custom field (Allowed)'],
  overpayment:       ['Total Overpayment', 'Custom field (Total Overpayment)', 'Overpayment', 'Custom field (Overpayment)'],
  provider:          ['Custom field (Provider)', 'Provider'],
  providerNPI:       ['Custom field (Provider NPI)', 'Provider-NPI', 'Provider NPI', 'Provider-NPI'],
  payer:             ['Custom field (Payer)', 'Payer'],
  patientId:         ['Custom field (Patient ID)', 'Custom field (Patient-ID)', 'Custom field (Patient-Id)', 'Patient ID', 'Patient-ID'],
  assignee:          ['Assignee'],
  reporter:          ['Reporter'],
  claimId:           ['Custom field (Claim-ID)', 'Custom field (Claim(s) ID)'],
  carrier:           ['Custom field (Carrier Name)', 'Custom field (Carrier)'],
  charges:           ['Custom field (Total Charges)'],
  tenant:            ['Custom field (Tenant-Alias)', 'Tenant-Alias'],
  externalKey:       ['Custom field (External-Key)', 'External-Key', 'External Key'],
  typeOfBill:        ['Type of Bill', 'Type of bill'],
  medReview:         ['Medical Record reviewed?', 'Medical Record reviewed'],
  claimCategory:     ['Claim Category', 'Claim Category'],
  publicStatus:      ['Custom field (Public-Status)', 'Public-Status'],
  publicStatusDesc:  ['Custom field (Public-Status-Description)', 'Custom field (Closure Summary )', 'Closure Summary', 'Public-Status-Description']
};

// Tenant configuration from original HTML
const TENANT_RATES = {
  'test-pc': 0.30,
  'ds': 0.30,
  'harel': 0.21,
  'fnx': 0.30
};

const TENANT_NAMES = {
  'test-pc': 'PassportCard Travel',
  'ds': 'DavidShield (PassportCard Relocation)',
  'harel': 'Harel',
  'fnx': 'FNX'
};

const DEFAULT_RATE = 0.30;

/**
 * Get tenant fee rate
 */
function getTenantRate(tenant) {
  if (!tenant) return DEFAULT_RATE;
  return TENANT_RATES[tenant.trim().toLowerCase()] ?? DEFAULT_RATE;
}

/**
 * Get tenant display name
 */
function getTenantName(tenant) {
  if (!tenant) return '—';
  return TENANT_NAMES[tenant.trim().toLowerCase()] ?? tenant;
}

/**
 * Fetch claims data from Jira for a specific tenant
 */
async function fetchTenantClaims(tenant) {
  const jira = createJiraClient();

  // JQL query to fetch claims for specific tenant
  const jql = `
    project = CLAIM
    AND "Tenant-Alias" = "${tenant}"
    ORDER BY created DESC
  `;

  const allIssues = [];
  let startAt = 0;
  const maxResults = 100; // Jira pagination limit

  console.log(`Fetching Jira data for tenant: ${tenant}`);

  try {
    // Paginate through all results
    while (true) {
      const result = await jira.searchJira(jql, {
        startAt,
        maxResults,
        fields: ['*all'] // Fetch all fields including custom fields
      });

      allIssues.push(...result.issues);
      console.log(`  Fetched ${result.issues.length} issues (total: ${allIssues.length}/${result.total})`);

      if (result.issues.length < maxResults || allIssues.length >= result.total) {
        break;
      }

      startAt += maxResults;
    }

    console.log(`✓ Fetched ${allIssues.length} total issues for ${tenant}`);

    // Transform Jira issues to CSV-like format
    const transformedClaims = allIssues.map(transformJiraIssue);

    return transformedClaims;

  } catch (error) {
    console.error(`✗ Error fetching Jira data for ${tenant}:`, error.message);
    throw error;
  }
}

/**
 * Transform Jira issue to CSV-like row format
 */
function transformJiraIssue(issue) {
  const fields = issue.fields;

  // Create a flat object similar to CSV export
  const row = {
    'Issue key': issue.key,
    'Summary': fields.summary || '',
    'Status': fields.status?.name || '',
    'Created': fields.created || '',
    'Resolved': fields.resolutiondate || '',
    'Updated': fields.updated || '',
    'Assignee': fields.assignee?.displayName || '',
    'Reporter': fields.reporter?.displayName || ''
  };

  // Map all custom fields
  if (fields.customfield_10050) row['Total Allowed'] = fields.customfield_10050;
  if (fields.customfield_10051) row['Total Overpayment'] = fields.customfield_10051;
  if (fields.customfield_10052) row['Provider'] = fields.customfield_10052;
  if (fields.customfield_10053) row['Provider NPI'] = fields.customfield_10053;
  if (fields.customfield_10054) row['Payer'] = fields.customfield_10054;
  if (fields.customfield_10055) row['Patient ID'] = fields.customfield_10055;
  if (fields.customfield_10056) row['Tenant-Alias'] = fields.customfield_10056;
  if (fields.customfield_10057) row['Closed-At'] = fields.customfield_10057;
  if (fields.customfield_10058) row['External-Key'] = fields.customfield_10058;
  if (fields.customfield_10059) row['Type of Bill'] = fields.customfield_10059;
  if (fields.customfield_10060) row['Medical Record reviewed'] = fields.customfield_10060;
  if (fields.customfield_10061) row['Claim Category'] = fields.customfield_10061;
  if (fields.customfield_10062) row['Public-Status'] = fields.customfield_10062;
  if (fields.customfield_10063) row['Closure Summary'] = fields.customfield_10063;
  if (fields.customfield_10064) row['Claim-ID'] = fields.customfield_10064;
  if (fields.customfield_10065) row['Carrier Name'] = fields.customfield_10065;
  if (fields.customfield_10066) row['Total Charges'] = fields.customfield_10066;

  // Add any other fields from the issue
  Object.keys(fields).forEach(key => {
    if (key.startsWith('customfield_') && !row[key]) {
      const value = fields[key];
      if (value !== null && value !== undefined) {
        row[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    }
  });

  return row;
}

/**
 * Test Jira connection
 */
async function testConnection() {
  try {
    const jira = createJiraClient();
    const result = await jira.getCurrentUser();
    console.log('✓ Jira connection successful:', result.displayName);
    return true;
  } catch (error) {
    console.error('✗ Jira connection failed:', error.message);
    return false;
  }
}

module.exports = {
  fetchTenantClaims,
  testConnection,
  getTenantRate,
  getTenantName,
  TENANT_RATES,
  TENANT_NAMES
};
