/**
 * Data Processor
 * Enriches and transforms raw Jira data for dashboard consumption
 */

// Field mapping (same as backend)
const FIELD_MAP = {
  summary: ['Summary'],
  issueKey: ['Issue key'],
  status: ['Status'],
  created: ['Custom field (Created-At)', 'Created-At', 'Created'],
  closed: ['Custom field (Closed-At)', 'Closed-At', 'Closed'],
  resolved: ['Resolved'],
  updated: ['Updated', 'Custom field (Updated-At)', 'Updated-At'],
  allowed: ['Total Allowed', 'Custom field (Total Allowed)', 'Allowed', 'Custom field (Allowed)', 'customfield_11552'],
  overpayment: ['Total Overpayment', 'Custom field (Total Overpayment)', 'Overpayment', 'Custom field (Overpayment)', 'customfield_10699'],
  provider: ['Custom field (Provider)', 'Provider', 'customfield_11566'],
  providerNPI: ['Custom field (Provider NPI)', 'Provider-NPI', 'Provider NPI', 'Provider-NPI', 'customfield_11562'],
  payer: ['Custom field (Payer)', 'Payer', 'customfield_11555'],
  patientId: ['Custom field (Patient-Id)', 'Custom field (Patient ID)', 'Custom field (Patient-ID)', 'Patient ID', 'Patient-ID', 'customfield_10303'],
  externalKey: ['Custom field (External-Key)', 'External-Key', 'External Key', 'customfield_10238'],
  charges: ['Custom field (Total Charges)', 'customfield_11549'],
  tenant: ['Custom field (Tenant-Alias)', 'Tenant-Alias', 'customfield_10237'],
  typeOfBill: ['Type of Bill', 'Type of bill', 'customfield_11550'],
  medicalRecordReviewed: ['Medical Record reviewed?', 'Medical Record Reviewed', 'Medical Record reviewed', 'Custom field (Medical Record reviewed?)', 'Custom field (Medical Record Reviewed)', 'customfield_11667'],
  claimCategory: ['Claim Category', 'Custom field (Claim Category)', 'customfield_11997'],
  publicStatus: ['Custom field (Public-Status)', 'Public-Status', 'customfield_10239'],
  publicStatusDesc: ['Public-Status-Description', 'Custom field (Public-Status-Description)', 'Custom field (Closure Summary )', 'Closure Summary', 'customfield_10667']
};

// Tenant rates and names (same as backend)
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
 * Get field value using flexible mapping
 */
function getField(row, fieldKey) {
  const aliases = FIELD_MAP[fieldKey] || [];
  for (const alias of aliases) {
    let val = row[alias];
    if (val !== undefined && val !== '') {
      // Try parsing JSON strings (Jira sometimes returns stringified objects)
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try {
          val = JSON.parse(val);
        } catch (e) {
          // Not valid JSON, use as-is
        }
      }
      // Handle arrays of Jira option objects (multi-select fields like Claim Category)
      if (Array.isArray(val) && val.length > 0 && val[0].value !== undefined) {
        return val.map(item => item.value).join(', ');
      }
      // Handle Jira API v3 objects with .value property (like select/dropdown fields)
      if (typeof val === 'object' && val !== null && val.value !== undefined) {
        return val.value;
      }
      // Handle Atlassian Document Format (ADF) — extract all text nodes
      if (typeof val === 'object' && val !== null && val.type === 'doc' && Array.isArray(val.content)) {
        const texts = [];
        const walk = (nodes) => {
          if (!Array.isArray(nodes)) return;
          for (const node of nodes) {
            if (node.type === 'text' && node.text) texts.push(node.text);
            if (node.content) walk(node.content);
          }
        };
        walk(val.content);
        return texts.join(' ').trim();
      }
      return val;
    }
  }
  return '';
}

/**
 * Parse numeric value
 */
function parseNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const str = String(val).replace(/[,$%]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Parse date from various formats (ISO, DD/MM/YYYY, DD/Mon/YY)
 */
function parseDate(val) {
  if (!val || val === '—' || val === '') return null;
  const s = String(val).trim();
  // Try DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const d = new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);
    return isNaN(d.getTime()) ? null : d;
  }
  // Try DD/Mon/YY (e.g., 23/Jun/26)
  const dmy2 = s.match(/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{2,4})$/);
  if (dmy2) {
    const months = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
    const mon = months[dmy2[2].toLowerCase()];
    if (mon !== undefined) {
      let yr = +dmy2[3];
      if (yr < 100) yr += 2000;
      const d = new Date(yr, mon, +dmy2[1]);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  // Standard Date parse (ISO, etc.)
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Get month key (YYYY-MM) for grouping
 */
function getMonthKey(date) {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

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
 * Clean comment text (remove Jira markup)
 */
function cleanCommentText(v) {
  if (!v) return '—';

  let s = String(v);

  // Try to parse as JSON object like {"done":"text here"}
  if (s.startsWith('{') && s.includes(':')) {
    try {
      const obj = JSON.parse(s);
      // Extract the first non-empty value from any key
      let foundValue = false;
      for (const key in obj) {
        if (obj[key] && String(obj[key]).trim()) {
          s = String(obj[key]);
          foundValue = true;
          break;
        }
      }
      // If all values are empty, return early
      if (!foundValue) {
        return '—';
      }
    } catch (e) {
      // Not valid JSON, continue with string cleaning
    }
  }

  // Clean up formatting codes and Jira artifacts
  s = s.replace(/\{code(:[a-z]+)?\}/gi, '');
  s = s.replace(/code:json/gi, '');
  s = s.replace(/[\{\}\"\\]/g, ' ');
  s = s.replace(/\bdone\s*:/gi, '');
  s = s.replace(/\s+/g, ' ');
  return s.trim() || '—';
}

/**
 * Enrich a raw row with calculated fields
 * Returns null if row is invalid
 */
function enrichRow(row) {
  if (!row['Issue key'] || row['Issue key'].trim() === '') {
    return null;
  }

  const r = { ...row };

  // Parse numeric fields
  r._allowed = parseNum(getField(r, 'allowed'));
  r._overpayment = parseNum(getField(r, 'overpayment'));

  // Parse string fields
  r._provider = (getField(r, 'provider') || '').trim();
  r._npi = (getField(r, 'providerNPI') || '').trim();
  r._payer = (getField(r, 'payer') || '').trim();
  r._status = (getField(r, 'publicStatus') || '').trim();
  r._patientId = (getField(r, 'patientId') || '').trim();
  r._typeOfBill = (getField(r, 'typeOfBill') || '').trim();
  r._medicalRecordReviewed = (getField(r, 'medicalRecordReviewed') || '').trim();
  r._claimCategory = (getField(r, 'claimCategory') || '').trim();
  r._comment = cleanCommentText(getField(r, 'publicStatusDesc'));

  // Parse dates
  const createdRaw = getField(r, 'created');
  const closedRaw = getField(r, 'closed') || getField(r, 'resolved') || getField(r, 'updated');

  r._created = parseDate(createdRaw);
  r._closed = parseDate(closedRaw);
  r._monthKey = getMonthKey(r._created);

  // Calculate close days
  if (r._created && r._closed) {
    r._closeDays = (r._closed - r._created) / (1000 * 60 * 60 * 24);
  } else {
    r._closeDays = null;
  }

  // Calculate fee percentage
  r._feePct = (r._allowed && r._overpayment) ? r._overpayment / r._allowed : null;

  // Tenant info
  const rawTenant = (getField(r, 'tenant') || '').trim().toLowerCase();
  r._tenant = getTenantName(rawTenant);
  r._tenantKey = rawTenant;

  // Calculate Bluespine fee
  r._feeRate = getTenantRate(rawTenant);
  r._bluespineFee = r._overpayment !== null ? r._overpayment * r._feeRate : null;

  return r;
}

/**
 * Process raw claims data into enriched format
 */
function processData(rawClaims) {

  const enriched = rawClaims
    .map(enrichRow)
    .filter(r => r !== null);


  return enriched;
}

// Export functions
window.DataProcessor = {
  processData,
  enrichRow,
  getTenantName,
  getTenantRate,
  cleanCommentText,
  TENANT_RATES,
  TENANT_NAMES
};
