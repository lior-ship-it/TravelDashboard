# Bluespine Dashboard Frontend

Modern, interactive dashboard UI with Jira API integration, date range filtering, and CSV export.

## Features

✅ **Implemented:**
- API-powered data loading (no manual CSV uploads)
- Date range picker with quick filters (Last 30/90 days, YTD)
- Export filtered data as CSV
- Refresh button for manual data updates
- Real-time "last updated" indicator
- Tenant-specific branding

## Structure

```
frontend/
├── public/
│   └── index.html          # Landing page (simple)
├── dashboard/
│   ├── index.html          # Main dashboard
│   ├── js/
│   │   ├── api.client.js       # API communication
│   │   ├── data.processor.js   # Data enrichment
│   │   └── export.service.js   # CSV export
│   └── css/
│       └── styles.css          # (future: extracted CSS)
```

## How It Works

### 1. URL-Based Authentication

Dashboard URLs follow this pattern:
```
http://localhost:3000/:tenant/:token
```

Example:
```
http://localhost:3000/harel/a1b2c3d4e5f6...
```

The API client extracts `tenant` and `token` from the URL and uses them to authenticate API requests.

### 2. Data Loading Flow

```
Page Load
   ↓
Initialize API Client (extract tenant/token from URL)
   ↓
Fetch Data from API (/api/data/:tenant/:token)
   ↓
Process Data (enrich with calculated fields)
   ↓
Setup Filters (populate dropdowns)
   ↓
Apply Default Filter (last 90 days)
   ↓
Render Dashboard (KPIs, charts, table)
```

### 3. Modules

**api.client.js**
- Extracts tenant/token from URL
- Fetches data from backend API
- Handles authentication errors
- Provides "last updated" formatting

**data.processor.js**
- Enriches raw Jira data with calculated fields
- Parses dates, numbers, and text
- Calculates Bluespine fees based on tenant rates
- Handles field mapping (flexible column names)

**export.service.js**
- Exports filtered data as CSV
- Handles CSV escaping (commas, quotes)
- Generates timestamped filenames

### 4. New Features

**Date Range Picker**
- Replaces static month dropdown
- Flexible start/end date selection
- Quick filters: Last 30 days, Last 90 days, Year-to-Date
- Default: Last 90 days

**CSV Export**
- Exports currently filtered data
- Includes all relevant columns
- Filename format: `bluespine_dashboard_{tenant}_{date}.csv`

**Refresh Button**
- Manually refresh data from Jira
- Updates "last updated" indicator
- Bypasses cache if backend configured

## Development

### Local Testing

1. Start the backend server:
```bash
cd ../backend
npm start
```

2. Generate a tenant link:
```bash
node ../tools/generate-link.js harel
```

3. Open the generated URL in your browser

### File Modifications

The dashboard (`index.html`) is a single-file app with inline CSS and JavaScript. To modify:

- **Styles**: Edit `<style>` block in `<head>`
- **API calls**: Edit `js/api.client.js`
- **Data processing**: Edit `js/data.processor.js`
- **Filters/Charts**: Edit functions in `<script>` block

### Browser Compatibility

- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Requires JavaScript enabled
- Uses Fetch API (no polyfill needed for modern browsers)

## Customization

### Tenant Rates

Edit `TENANT_RATES` in both:
- `backend/src/services/jira.service.js`
- `frontend/dashboard/js/data.processor.js`

```javascript
const TENANT_RATES = {
  'test-pc': 0.30,
  'ds': 0.30,
  'harel': 0.21,   // ← 21% for Harel
  'fnx': 0.30
};
```

### Tenant Names

Edit `TENANT_NAMES` in both files:
```javascript
const TENANT_NAMES = {
  'test-pc': 'PassportCard Travel',
  'ds': 'DavidShield (PassportCard Relocation)',
  'harel': 'Harel',
  'fnx': 'FNX'
};
```

### Chart Colors

Edit CSS variables in `<style>`:
```css
:root {
  --gold: #e8a020;     /* Primary accent */
  --blue-acc: #3d8ef0; /* Secondary accent */
  --green: #22d3a5;    /* Success/positive */
  --red: #f05a5a;      /* Error/negative */
}
```

## Future Enhancements

Possible improvements:
- [ ] Click-to-filter on charts (interact with chart to filter table)
- [ ] PDF report generation
- [ ] Email scheduling for reports
- [ ] Dark/light mode toggle
- [ ] Mobile responsive optimizations
- [ ] Saved filter presets in localStorage
- [ ] Provider deep-dive modal
- [ ] Comparison mode (compare two time periods)

## Troubleshooting

### Issue: "Invalid or expired access link"

**Solution:** Generate a new link:
```bash
node tools/generate-link.js <tenant>
```

### Issue: Dashboard shows "Loading..." forever

**Possible causes:**
- Backend server not running
- Network connectivity issue
- CORS configuration problem

**Solution:**
1. Check backend is running: `curl http://localhost:3000/api/health`
2. Check browser console for errors (F12 → Console)
3. Verify URL format is correct: `/tenant/token`

### Issue: No data displayed

**Possible causes:**
- No data in Jira for this tenant
- Cache is empty and Jira fetch failed
- Date range filter excludes all data

**Solution:**
1. Check backend logs for Jira errors
2. Try resetting filters (Reset button)
3. Manually refresh data (Refresh button)

### Issue: Export CSV is empty

**Solution:** Check that filters aren't excluding all data. The "X of Y claims" counter shows how many match.

## Dependencies

- **Chart.js 4.4.1** - Charts and visualizations
- **Google Fonts (Inter)** - Typography
- No build process required - pure HTML/CSS/JS
