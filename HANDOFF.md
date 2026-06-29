# TravelDash Project Handoff

**Date:** June 29, 2026  
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

**Fix:** Changed `loadDataFromAPI()` to call `setupFilters()` (which populates dropdowns, attaches listeners, then calls `setQuickRange('last90')` → `applyFilters()` → `computeAndRender()`).

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

### Dashboard URL
```
http://localhost:3000/harel/90ff3c4b30847a8336cb5447654972d6f4a64dd5c544eb37268d63f8f89c58ea
```

### Tenant Configuration
- **Tenant:** harel
- **Token:** 90ff3c4b30847a8336cb5447654972d6f4a64dd5c544eb37268d63f8f89c58ea
- **Expires:** September 27, 2026 (90 days from creation)
- **Jira Project:** CLAIM (ClaimsOps)
- **Records:** 24 claims (no date filter)

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
