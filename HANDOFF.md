# TravelDash Project Handoff

**Date:** June 30, 2026  
**Status:** WORKING  
**Repo:** https://github.com/lior-ship-it/TravelDashboard  
**Type:** Automated Jira Dashboard with Secure Tenant Links

---

## Resolved Issues

### Fields Not Displaying (FIXED)
**Root Cause:** `index.html` had inline `getField()` and `enrichRow()` functions that **shadowed** the correct versions in the external `data.processor.js`. The inline versions lacked JSON parsing for Jira API v3's stringified objects.

**Fix:** Removed the inline `getField()` and `enrichRow()` declarations from `index.html`. The external `data.processor.1782732316.js` now provides the only definitions.

### Close Comment Blank (FIXED)
**Root Cause:** Two issues:
1. `customfield_10667` (Public-Status-Description) was missing from the `publicStatusDesc` FIELD_MAP
2. The field value uses Jira's Atlassian Document Format (ADF), which wasn't being extracted

**Fix:** Added `customfield_10667` to FIELD_MAP and added ADF text-node extraction in `getField()`.

### Filters Not Working (FIXED)
**Root Cause:** `setupFilters()` was only called in the CSV upload path (`loadData()`), never in the API path (`loadDataFromAPI()`). Filter dropdowns were never populated and event listeners never attached.

**Fix:** Changed `loadDataFromAPI()` to call `setupFilters()` (which populates dropdowns, attaches listeners, then calls `applyFilters()` → `computeAndRender()`). **Note:** As of Session 8, default date range removed — all data shown by default.

### Save Dashboard Broken (FIXED)
**Root Cause:** Saved HTML still had `<script src="/js/...">` tags pointing to the server. When opened from disk, these fail to load → `window.apiClient` is undefined → "API Client not loaded" error. Additionally, `DOMContentLoaded` always called `loadDataFromAPI()` without checking for embedded data.

**Fix:**
1. `DOMContentLoaded` now checks `if (allData.length > 0)` first — if data is embedded (saved file), renders immediately without API call
2. `saveDashboard()` now fetches external JS module contents and inlines them as `<script>` blocks in the saved HTML — produces a fully self-contained file that works offline

### Additional Fixes Applied
- `parseDate` — handles DD/MM/YYYY and DD/Mon/YY formats (not just ISO)
- `parseNum` — strips `%` character
- `cleanCommentText` — strips `{}"\ ` characters and `done:` prefix
- `FIELD_MAP.medicalRecordReviewed` — added `'Medical Record reviewed?'` alias
- `resetFilters()` — truly resets (no longer re-applies 90-day range)
- `TABLE_COLS._claimCategory` — handles arrays and deduplicates values
- Removed 6 stale versioned JS files and all debug `console.log` statements

---

## What's Working

### Backend (100%)
- Express server on port 3000
- API endpoint: `GET /api/data/:tenant/:token`
- Returns 24 claims with all fields
- SQLite database with 4-hour cache
- Auto-sync job every 4 hours
- Tenant: "harel" with secure token

### Frontend (100%)
- All fields display correctly (Payer, Public Status, Provider, Type of Bill, etc.)
- JSON string parsing for Jira API v3 select/dropdown fields
- ADF (Atlassian Document Format) text extraction for rich-text fields
- Close comments extracted and displayed
- Filters populate and work (payer, provider, status, NPI, type of bill, date range)
- Reset shows all data; date range buttons (30d, 90d, YTD) work
- Save Dashboard produces self-contained offline HTML
- Charts, KPIs, table pagination, sorting all functional

---

## Project Structure

```
TravelDash/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express server (PORT 3000)
│   │   ├── config/
│   │   │   └── database.js        # SQLite setup
│   │   ├── services/
│   │   │   ├── cache.service.js   # 4-hour cache
│   │   │   ├── jira.service.js    # Jira API v3 integration
│   │   │   └── link.service.js    # Secure token generation
│   │   ├── routes/
│   │   │   ├── api.routes.js      # GET /api/data/:tenant/:token
│   │   │   └── admin.routes.js    # Admin endpoints
│   │   └── jobs/
│   │       └── data-sync.job.js   # Auto-refresh every 4 hours
│   ├── data/
│   │   └── bluespine.db           # SQLite (24 claims cached)
│   └── package.json
│
├── frontend/
│   └── dashboard/
│       ├── index.html             # Main dashboard (inline script uses external modules)
│       └── js/
│           ├── api.client.js              # API client
│           ├── api.client.1782732316.js   # API client (cache-busted, loaded by HTML)
│           ├── data.processor.js          # Data processor
│           ├── data.processor.1782732316.js # Data processor (cache-busted, loaded by HTML)
│           └── export.service.js          # CSV export
│
├── HTMLSource/                     # Working manual reference version
├── docs/                           # API, setup, deployment docs
└── tools/                          # CLI utilities (generate-link, test-jira)
```

---

## Access Details

### Tenant Links (all created 2026-06-29, expire 2026-09-27)

| Tenant | Dashboard URL |
|--------|--------------|
| ds | `http://localhost:3000/ds/a529e7cd221ef5777cd24c61eb8a92d5ed79b5aa328ae839137edb67817d950a` |
| harel | `http://localhost:3000/harel/90ff3c4b30847a8336cb5447654972d6f4a64dd5c544eb37268d63f8f89c58ea` |
| test-pc | `http://localhost:3000/test-pc/7a245aa5ffa8f72b3562dfe657bdfc462fa10bc1494dec122a9323cdf6ad1b9b` |

Full link directory: [docs/TENANT_LINKS.md](docs/TENANT_LINKS.md)

### Generate New Link
```bash
cd backend
node tools/generate-link.js TENANT_NAME
```
Available tenants: `test-pc`, `ds`, `harel`, `fnx`

### Tenant Configuration
- **Jira Project:** CLAIM (ClaimsOps)
- **Records:** 24 claims (no date filter)
- **Link expiry:** 90 days from creation

---

## Environment Variables

**File:** `backend/.env` (not committed — see `backend/.env.example`)
```env
JIRA_HOST=bluespine.atlassian.net
JIRA_API_TOKEN=<redacted>
JIRA_EMAIL=<redacted>
NODE_ENV=development
PORT=3000
```

---

## Key Commands

### Start Server
```bash
cd /Users/lior/Documents/TravelDash/backend
node src/server.js
```

### Test API
```bash
curl -s "http://localhost:3000/api/data/harel/90ff3c4b30847a8336cb5447654972d6f4a64dd5c544eb37268d63f8f89c58ea" | jq '.claims | length'
# Returns: 24
```

### Check Server Process
```bash
lsof -i :3000
```

### Push to GitHub
```bash
cd /Users/lior/Documents/TravelDash
git push -u origin main
```

---

## Technical Details

### Jira API Integration
- **Endpoint:** `POST /rest/api/3/search/jql`
- **JQL Query:** `project = CLAIM ORDER BY created DESC`
- **Response:** Max 100 results per page
- **Fields:** All custom fields returned with `customfield_*` IDs

### Custom Field IDs
| Field | ID | Format |
|-------|-----|--------|
| Payer | customfield_11555 | JSON string with `.value` |
| Public Status | customfield_10239 | JSON string with `.value` |
| Provider | customfield_11566 | Plain string |
| Provider NPI | customfield_11562 | Plain string |
| Patient ID | customfield_10303 | Plain string |
| Type of Bill | customfield_11550 | JSON string with `.value` |
| Medical Record Reviewed | customfield_11837 | JSON string with `.value` |
| Public-Status-Description | customfield_10667 | ADF (Atlassian Document Format) |
| Total Allowed | customfield_11552 | Number |
| Total Overpayment | customfield_10699 | Number |
| Tenant | customfield_10237 | Plain string |
| External Key | customfield_10238 | Plain string |

### Data Processing Pipeline
1. API returns raw claims with `customfield_*` keys
2. `getField()` resolves aliases via `FIELD_MAP` → finds correct field
3. JSON strings are parsed, `.value` extracted for select/dropdown fields
4. ADF documents have text nodes recursively extracted
5. `cleanCommentText()` strips Jira markup and extracts description from `{"status":"text"}` format
6. `enrichRow()` builds computed fields (`_payer`, `_status`, `_comment`, `_typeOfBill`, etc.)
7. `setupFilters()` populates dropdowns from unique enriched values
8. `applyFilters()` filters by date range, payer, provider, status, NPI, overpayment, type of bill

### Save Dashboard Flow
1. `saveDashboard()` fetches `/js/*.js` module contents via `fetch()`
2. Clones the DOM, replaces external `<script src>` with inline `<script>` blocks
3. Embeds `allData` JSON into the inline script (replaces `let allData = [];`)
4. Downloads as self-contained HTML (works offline, ~180KB)
5. On load, `DOMContentLoaded` detects embedded data → renders without API call

### Cache Logic
- **TTL:** 4 hours
- **Auto-refresh:** Every 4 hours via cron job
- **Storage:** SQLite `claims` table
- **Key:** `tenant` + `access_token`

---

## Dependencies

### Backend
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "better-sqlite3": "^9.2.2",
  "node-cron": "^3.0.3",
  "dotenv": "^16.3.1"
}
```

### Node Version
- **Installed:** v20.20.2 LTS (via nvm)

---

## Session History

### Session 1 - Initial Setup
- Express server, Jira API v3, SQLite caching, basic dashboard UI

### Session 2 - Field Mapping
- Mapped all custom fields, added FIELD_MAP, implemented `getField()`

### Session 3 - Cache Debugging (Misdiagnosed)
- Identified JSON string issue, added parsing logic to external JS
- Multiple cache-busting attempts — actual issue was inline function shadowing

### Session 4 - Full Fix & Feature Complete
- Identified real root cause: inline `getField()` and `enrichRow()` shadowing external versions
- Removed inline duplicates, external module now sole source of truth
- Added `customfield_10667` to FIELD_MAP for close comments
- Added ADF text extraction for rich-text Jira fields
- Fixed `setupFilters()` not being called in API path
- Fixed `resetFilters()` re-applying 90-day range
- Fixed `parseDate` to handle DD/MM/YYYY and DD/Mon/YY formats
- Fixed `cleanCommentText` to strip Jira artifacts
- Fixed `saveDashboard()` to produce self-contained offline HTML
- Fixed `DOMContentLoaded` to detect embedded data in saved files
- Added `_claimCategory` array/dedup handling in TABLE_COLS
- Cleaned up old versioned files and all debug logging
- Pushed to GitHub: https://github.com/lior-ship-it/TravelDashboard

### Session 5 - UI Polish
- Made "Top Providers by Total Overpayment" list clickable — clicking a provider filters the table to that provider; clicking again clears the filter (toggle)
- Added hover highlight and pointer cursor to provider rows
- Replaced blocky JPEG logo with cleaner circular PNG (blue circle + white fish silhouette from `HTMLSource/image001.png`) — better color harmony with dashboard theme
- Increased logo size from 26px to 38px for better visibility and prominence in header

### Session 6 - Change Tracking Implementation
**Goal:** Track changes to claim data over time (overpayment amounts, date fields) to enable audit trail and historical analysis.

**Changes Made:**

#### Backend Infrastructure
- **New Database Table:** `change_history`
  - Field-level change tracking (issue_key, tenant, field_name, old_value, new_value, change_type, changed_at)
  - Indexed for fast queries by tenant, date, and issue
  - Foreign key to `refresh_log` for sync traceability
  - File: `backend/src/config/database.js`

- **New Service:** `backend/src/services/change-tracking.service.js`
  - `detectChanges()` - Snapshot comparison between old and new data
  - `recordChanges()` - Bulk insert changes to database
  - `getRecentChanges()` - Query with date range and field filtering
  - Tracks 5 fields: Total Overpayment, Created Date, Updated Date, Resolution Date, Closed Date
  - Handles JSON string parsing and date normalization from Jira API v3

- **Modified Sync Job:** `backend/src/jobs/data-sync.job.js`
  - Loads old data before clearing cache (for comparison)
  - Detects changes by comparing snapshots
  - Records changes to database with sync_id reference
  - Wrapped in try-catch to ensure sync continues even if change tracking fails
  - Change detection adds ~0.5-1s to sync time

- **New API Endpoint:** `GET /api/data/:tenant/:token/changes`
  - Query parameters: `days` (7/30/90, default 30), `field` (optional filter)
  - Returns JSON with change history: issueKey, fieldName, oldValue, newValue, changeType, changedAt
  - File: `backend/src/routes/api.routes.js`

#### Frontend Display
- **New Section:** "Recent Changes" below raw claims data
  - Filter dropdowns: date range (7/30/90 days) and field type
  - Color-coded left border: green for increases, red for decreases
  - Grid layout: Claim ID | Field + old→new values | Timestamp
  - File: `frontend/dashboard/index.html` (HTML + CSS)

- **JavaScript Functions:** `frontend/dashboard/js/data.processor.js`
  - `loadRecentChanges()` - Fetches from API endpoint
  - `renderChanges()` - Displays in UI with formatting
  - `formatChangeValue()` - Currency ($) and date formatting
  - `setupChangeFilters()` - Event listeners for dropdowns
  - Auto-loads on page load (30 days default)
  - Not available in saved/offline HTML files

#### Technical Details
- **Change Detection Strategy:** Snapshot comparison (no Jira changelog API calls for performance)
- **Tracked Fields:**
  - `overpayment` → Total Overpayment (numeric, $ formatted)
  - `created` → Created Date
  - `updated` → Updated Date
  - `resolved` → Resolution Date
  - `closed_at` → Closed Date (customfield_10057)
- **Performance Impact:** +0.5-1s per sync cycle for change detection
- **Storage Growth:** ~50-200 bytes per change; ~7KB/day estimated
- **Database Indexes:** Optimized for tenant + date range queries (<50ms)

#### Testing Results
✅ Database schema created with indexes  
✅ API endpoint returns filtered change history  
✅ Frontend displays changes with proper styling  
✅ Increase/decrease color coding works  
✅ Date range and field filters functional  
✅ Test data verified end-to-end

#### Testing & Issues Discovered

**Successful Tests:**
✅ Database schema and change_history table created  
✅ API endpoint working (`/api/data/:tenant/:token/changes`)  
✅ Frontend "Recent Changes" section displaying correctly  
✅ Date field changes detected (Updated Date for CLAIM-284, CLAIM-285, CLAIM-276)  
✅ Filters working (7/30/90 days, field type)  
✅ Color-coded borders (green=increase, red=decrease)

**Issues Found During Testing:**
1. **Field Mapping Problem:** Different tenants use different customfield IDs
   - `harel` uses `customfield_10051` for overpayment
   - `test-pc` uses `customfield_10699` for overpayment
   - Current solution: Added multiple field IDs to `TRACKED_FIELDS.overpayment.jiraFields` array
   - Better solution needed: Dynamic field mapping per tenant or field name lookup

2. **Admin Refresh Endpoint Bug:** 
   - `POST /api/admin/refresh/:tenant` was NOT running change detection
   - Directly called `clearCache()` and `setCachedData()` bypassing change tracking logic
   - **Fixed:** Modified to call `refreshTenant()` from data-sync.job which includes change tracking
   - **Note:** Browser cache issue required updating both `data.processor.js` AND `data.processor.1782732316.js` (hashed version)

3. **Browser Caching:**
   - JavaScript changes weren't reflected until hard refresh (Cmd+Shift+R)
   - HTML references hashed JavaScript file: `data.processor.1782732316.js`
   - Must update both the main file and hashed version for changes to appear

4. **API URL Construction:**
   - Initial bug: JavaScript used `window.location.pathname + '/changes'` 
   - Dashboard at `/tenant/token` but API at `/api/data/tenant/token/changes`
   - **Fixed:** Parse pathname and construct correct API URL

#### Known Limitations
- No data retention policy yet (future: auto-delete changes older than 1 year)
- No Jira changelog integration (no author attribution for who made changes)
- Changes detected at 4-hour sync intervals (not real-time)

---

## Session 7 - Change Tracking Fixes & UI Overhaul

**Goal:** Fix broken change tracking, redesign the Recent Changes table, fix missing 2025 claims.

### Fixes Applied

#### 1. Field Mapping Fix
**Root Cause:** `TRACKED_FIELDS` in `change-tracking.service.js` looked for raw `customfield_10051` first, but `transformJiraIssue` stores data under display names like `'Total Overpayment'`. The correct overpayment field is `customfield_10699`.

**Fix:**
- Changed `TRACKED_FIELDS.overpayment.jiraFields` to `['customfield_10699', 'Total Overpayment', 'Overpayment']`
- Fixed `jira.service.js` line 136: maps `customfield_10699` (not `customfield_10051`) to `'Total Overpayment'`
- Renamed display name from "Total Overpayment" to "Overpayment"

#### 2. Sync Job TTL Bypass
**Root Cause:** `refreshTenant()` used `getCachedData()` which has a 4-hour TTL. At the boundary the function returned null, making change detection treat all data as "created."

**Fix:** Sync job now queries claims table directly (`SELECT raw_data FROM claims WHERE tenant = ?`) without TTL check.

#### 3. Jira API Inconsistency — Missing 2025 Claims
**Root Cause:** Jira's search API returns different result sets depending on sort order (`ORDER BY created DESC` vs `ASC`). The reported `total` is unreliable — test-pc had 72 claims but Jira reported 50.

**Fix:** `fetchTenantClaims()` now fetches both DESC and ASC, deduplicates by issue key. test-pc went from 50 → 72 claims.

#### 4. Removed "Created" Change Type
New claims appearing in the DB for the first time are no longer recorded as changes. Only actual overpayment value changes (old → new) are tracked.

#### 5. Removed Date Field Tracking
Only overpayment changes are tracked now. Removed: Created Date, Updated Date, Resolution Date, Closed Date.

### UI Changes

#### Recent Changes Table Redesign
- **Header:** Uses `.section-title` class (matches other sections), with `margin-top: 28px` spacing
- **Layout:** Proper `<table>` (same style as Raw Claims Data table)
- **Columns:** Claim | External Key | Patient ID | Provider | NPI | Old OVP $ | New OVP $ | Created | Updated
- **Color coding:** Red left border = decrease, green = increase
- **Filter:** Days dropdown (All / 7 / 30 / 90) aligned right
- **Saved HTML:** Changes data embedded in saved files (via `changesData` variable)

#### "All" Date Range Button
- Added "All" button to main table date filters (after YTD)
- Clears both date inputs, shows all claims regardless of creation date

### Files Modified
- `backend/src/services/change-tracking.service.js` — Field mapping, removed date tracking, removed "created" type
- `backend/src/services/jira.service.js` — Dual-direction fetch, fixed `customfield_10699` mapping
- `backend/src/jobs/data-sync.job.js` — TTL bypass for old data loading
- `backend/src/routes/api.routes.js` — Simplified changes endpoint (no field filter)
- `frontend/dashboard/index.html` — Table redesign, All button, saved HTML embedding, CSS
- `frontend/dashboard/js/data.processor.js` — Table rendering, currency formatting, color coding
- `frontend/dashboard/js/data.processor.1782732316.js` — Same (cache-busted copy)

### Testing Results
✅ Overpayment changes detected correctly (CLAIM-276: 1→0, CLAIM-284: None→1→None)
✅ 2025 claims now fetched and displayed (72 total for test-pc)
✅ "All" filter shows full claim history
✅ Changes table renders with proper styling and color coding
✅ Saved HTML includes embedded change data
✅ No false "created" entries on first-time claim discovery

---

## Session 8 - Removed Default Date Range Filter

**Goal:** Show all data by default instead of applying a 90-day date range filter automatically.

**Change:**
- Removed `setQuickRange('last90')` call from `setupFilters()` in [index.html:1132](frontend/dashboard/index.html#L1132)
- Replaced with `applyFilters()` to render all data without date filtering
- Users can still apply date range filters manually via the date range buttons (30d, 90d, YTD) or the "All" button

**Files Modified:**
- `frontend/dashboard/index.html` — Line 1132: removed default 90-day filter
- `HANDOFF.md` — Updated documentation to reflect new default behavior

**Testing:**
✅ Dashboard loads showing all claims (not just last 90 days)
✅ Date range buttons still work correctly
✅ "All" button shows all data (no change from new default behavior)
