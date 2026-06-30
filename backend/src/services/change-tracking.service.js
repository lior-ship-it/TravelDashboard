const { getDatabase } = require('../config/database');

// Fields to track for changes — overpayment only
const TRACKED_FIELDS = {
  overpayment: {
    jiraFields: ['customfield_10699', 'Total Overpayment', 'Overpayment'],
    displayName: 'Overpayment',
    type: 'numeric'
  }
};

/**
 * Extract field value from claim data
 * Handles multiple field name variations and JSON string parsing
 */
function extractFieldValue(claim, fieldNames) {
  for (const fieldName of fieldNames) {
    let value = claim[fieldName];

    if (value === undefined || value === null) {
      continue;
    }

    // Handle JSON strings (Jira API v3 format)
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && 'value' in parsed) {
          value = parsed.value;
        }
      } catch {
        // Not JSON, use as-is
      }
    }

    return value;
  }

  return null;
}

/**
 * Normalize value for comparison
 * Handles whitespace, null/undefined equivalence, date formatting
 */
function normalizeValue(value, type) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (type === 'numeric') {
    const num = parseFloat(value);
    return isNaN(num) ? null : num.toString();
  }

  if (type === 'date') {
    if (!value) return null;
    try {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
      return null;
    }
  }

  // Default: trim whitespace
  return typeof value === 'string' ? value.trim() : String(value);
}

/**
 * Compare two field values
 */
function valuesAreDifferent(oldValue, newValue, type) {
  const normalizedOld = normalizeValue(oldValue, type);
  const normalizedNew = normalizeValue(newValue, type);

  // Both null/undefined = no change
  if (normalizedOld === null && normalizedNew === null) {
    return false;
  }

  return normalizedOld !== normalizedNew;
}

/**
 * Detect changes between old and new claims data
 * Returns array of change records
 */
function detectChanges(tenant, oldClaims, newClaims) {
  const changes = [];
  const now = new Date().toISOString();

  // Build map of old claims for O(1) lookup
  const oldClaimsMap = new Map();
  for (const claim of oldClaims) {
    const issueKey = claim['Issue key'] || claim.issueKey;
    if (issueKey) {
      oldClaimsMap.set(issueKey, claim);
    }
  }

  // Check each new claim
  for (const newClaim of newClaims) {
    const issueKey = newClaim['Issue key'] || newClaim.issueKey;
    if (!issueKey) continue;

    const oldClaim = oldClaimsMap.get(issueKey);

    // New claim — skip, only track value changes on existing claims
    if (!oldClaim) continue;

    // Existing claim - check for field changes
    for (const [fieldKey, fieldConfig] of Object.entries(TRACKED_FIELDS)) {
      const oldValue = extractFieldValue(oldClaim, fieldConfig.jiraFields);
      const newValue = extractFieldValue(newClaim, fieldConfig.jiraFields);

      if (valuesAreDifferent(oldValue, newValue, fieldConfig.type)) {
        changes.push({
          issueKey,
          tenant,
          fieldName: fieldKey,
          fieldDisplayName: fieldConfig.displayName,
          oldValue: normalizeValue(oldValue, fieldConfig.type),
          newValue: normalizeValue(newValue, fieldConfig.type),
          changeType: 'updated',
          changedAt: now
        });
      }
    }
  }

  return changes;
}

/**
 * Record changes to database
 */
function recordChanges(changes, syncId) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO change_history (
      issue_key, tenant, field_name, field_display_name,
      old_value, new_value, change_type, changed_at, sync_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const change of changes) {
      stmt.run(
        change.issueKey,
        change.tenant,
        change.fieldName,
        change.fieldDisplayName,
        change.oldValue,
        change.newValue,
        change.changeType,
        change.changedAt,
        syncId
      );
    }
  })();

  console.log(`✓ Recorded ${changes.length} field changes`);
}

/**
 * Get recent changes for a tenant, enriched with claim context
 */
function getRecentChanges(tenant, days = 30) {
  const db = getDatabase();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const changes = db.prepare(`
    SELECT
      issue_key as issueKey,
      old_value as oldValue,
      new_value as newValue,
      changed_at as changedAt
    FROM change_history
    WHERE tenant = ? AND changed_at >= ? AND field_name = 'overpayment'
    ORDER BY changed_at DESC
    LIMIT 500
  `).all(tenant, cutoffDate.toISOString());

  // Enrich with claim context from current cached data
  const claimKeys = [...new Set(changes.map(c => c.issueKey))];
  const claimsMap = new Map();

  for (const key of claimKeys) {
    const row = db.prepare('SELECT raw_data FROM claims WHERE issue_key = ?').get(key);
    if (row) {
      const data = JSON.parse(row.raw_data);
      claimsMap.set(key, {
        externalKey: data['External-Key'] || data['customfield_10238'] || '',
        patientId: data['Patient-ID'] || data['Patient ID'] || data['customfield_10303'] || '',
        provider: data['Provider'] || data['customfield_11566'] || '',
        npi: data['Provider-NPI'] || data['Provider NPI'] || data['customfield_11562'] || '',
        created: data['Created'] || data['Created-At'] || '',
        updated: data['Updated'] || data['Updated-At'] || ''
      });
    }
  }

  return changes.map(c => ({
    ...c,
    ...(claimsMap.get(c.issueKey) || {})
  }));
}

module.exports = {
  detectChanges,
  recordChanges,
  getRecentChanges,
  TRACKED_FIELDS
};
