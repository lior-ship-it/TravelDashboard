# TravelDash Project Handoff

**Date:** June 29, 2026  
**Status:** WORKING  
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
- Filters, charts, KPIs, and table all functional

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
│   │   │   └── token.service.js   # Secure token generation
│   │   ├── routes/
│   │   │   ├── api.routes.js      # GET /api/data/:tenant/:token
│   │   │   └── admin.routes.js    # Admin endpoints
│   │   └── jobs/
│   │       └── data-sync.job.js   # Auto-refresh every 4 hours
│   ├── data/
│   │   └── bluespine.db           # SQLite (24 claims cached)
│   └── package.json
│
└── frontend/
    └── dashboard/
        ├── index.html             # Main dashboard (inline script uses external modules)
        ├── js/
        │   ├── api.client.js              # API client (base)
        │   ├── api.client.1782732316.js   # API client (loaded by HTML)
        │   ├── data.processor.js          # Data processor (base)
        │   ├── data.processor.1782732316.js # Data processor (loaded by HTML)
        │   └── export.service.js          # CSV export
        └── css/
            └── dashboard.css
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

**File:** `backend/.env`
```env
JIRA_BASE_URL=https://bluespine.atlassian.net
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
| Public-Status-Description | customfield_10667 | ADF (Atlassian Document Format) |
| Total Allowed | customfield_11552 | Number |
| Total Overpayment | customfield_10699 | Number |

### Data Processing Pipeline
1. API returns raw claims with `customfield_*` keys
2. `getField()` resolves aliases via `FIELD_MAP` → finds correct field
3. JSON strings are parsed, `.value` extracted for select/dropdown fields
4. ADF documents have text nodes recursively extracted
5. `cleanCommentText()` handles `{"status":"description"}` format in comments
6. `enrichRow()` builds computed fields (`_payer`, `_status`, `_comment`, etc.)

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

### Session 4 - Fix Applied (Current)
- Identified real root cause: inline `getField()` and `enrichRow()` in HTML shadowing external versions
- Removed inline duplicates, external module now sole source of truth
- Added `customfield_10667` to FIELD_MAP for close comments
- Added ADF text extraction for rich-text Jira fields
- Cleaned up old versioned files and debug logging
