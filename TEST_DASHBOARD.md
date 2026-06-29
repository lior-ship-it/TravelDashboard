# 🧪 Testing Your Dashboard

## Quick Test Steps

1. **Open your browser** to:
   ```
   http://localhost:3000/harel/5adcd1d99418c63310597fdf19f69880b445929dd073c4af0cde70d1f21c690c
   ```

2. **You should see:**
   - ✅ Bluespine logo and "Harel" tenant name
   - ✅ 4 KPI cards at the top (Total Claims, Overpayment, Fee, Processing Time)
   - ✅ 2 charts (Monthly Trends line chart, Status Distribution donut chart)
   - ✅ Claims table with 16 rows
   - ✅ Search bar above the table
   - ✅ Export CSV button

3. **If you see "API Client not loaded" error:**
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
   - Clear browser cache
   - Or open in incognito/private window

4. **Open Browser Console** (F12 or Right-click → Inspect → Console)
   - You should see:
     ```
     API Client initialized for tenant: harel
     Fetching data from API...
     ✓ Fetched 16 claims
     Processing 16 raw claims...
     ✓ Processed 16 valid claims
     ```

## What Was Fixed

**Problem:** Scripts were loading with `defer` in the `<head>`, causing them to execute after the inline script that uses them.

**Solution:** Moved the module scripts (`api.client.js`, `data.processor.js`, `export.service.js`) to load right before the inline script in the body, ensuring they're available when needed.

**Script Order Now:**
```html
<!-- Module scripts load first -->
<script src="js/api.client.js"></script>
<script src="js/data.processor.js"></script>
<script src="js/export.service.js"></script>

<!-- Inline script runs after, can use window.apiClient and window.DataProcessor -->
<script>
  // Dashboard initialization code
</script>
```

## Troubleshooting

### Still seeing the error?

1. **Check server is running:**
   ```bash
   curl http://localhost:3000/api/health
   ```
   Should return: `{"status":"ok",...}`

2. **Check scripts are accessible:**
   ```bash
   curl http://localhost:3000/js/api.client.js | head -5
   ```
   Should show JavaScript code

3. **Check data API:**
   ```bash
   curl "http://localhost:3000/api/data/harel/5adcd1d99418c63310597fdf19f69880b445929dd073c4af0cde70d1f21c690c" | jq '.claims | length'
   ```
   Should return: `16`

4. **Browser Console Errors:**
   - Open DevTools (F12)
   - Check Console tab for any red errors
   - Check Network tab - all scripts should return 200 OK

### Common Issues:

**"Cannot read properties of undefined"**
- Hard refresh the page (Cmd+Shift+R)
- The browser might have cached the old version

**No data showing**
- Check the API endpoint directly (step 3 above)
- Verify token is correct in URL

**Charts not rendering**
- Check if Chart.js loaded from CDN
- Open console and type: `typeof Chart`
- Should return: `"function"`

## Expected Dashboard Behavior

**On Load:**
1. Page loads with loading spinner
2. API fetches 16 claims from backend
3. Data is processed and enriched
4. KPI cards populate with numbers
5. Charts render with data
6. Table shows all 16 claims

**Interactive Features:**
- Click column headers to sort
- Type in search box to filter
- Click "Export CSV" to download data
- Click "🔄 Refresh Data" to fetch fresh data from Jira

## Success Criteria ✅

You'll know it's working when you see:
- ✅ Dashboard fully rendered
- ✅ 16 claims in the table
- ✅ Charts showing data
- ✅ KPI numbers displaying
- ✅ No errors in browser console
- ✅ Search and filtering work
- ✅ CSV export downloads a file

**If everything above works: SUCCESS! Your dashboard is fully operational! 🎉**
