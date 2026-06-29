# Next Steps - Getting Started

Your Bluespine Dashboard is **complete and ready to use**! Follow these steps to get it running.

## 🎯 Quick Start (5 minutes)

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Configure Jira Credentials

Create `.env` file from template:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
JIRA_HOST=your-domain.atlassian.net
JIRA_EMAIL=service-account@example.com
JIRA_API_TOKEN=<your-jira-token>
ADMIN_TOKEN=<generate-random-token>
PORT=3000
NODE_ENV=development
```

**To generate `ADMIN_TOKEN`:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**To get Jira API token:**
1. Log in to Jira
2. Go to: **Account Settings** → **Security** → **API tokens**
3. Click **Create API token**
4. Copy and paste into `.env`

### Step 3: Test Jira Connection
```bash
cd ..  # Back to project root
node tools/test-jira-connection.js
```

Expected output:
```
✓ Jira connection test passed!
```

### Step 4: Start Server
```bash
cd backend
npm start
```

You should see:
```
========================================
  Bluespine Dashboard API Server
========================================
  Environment: development
  Port: 3000
  URL: http://localhost:3000
========================================

✓ Database initialized at: ./data/bluespine.db
✓ Scheduled data sync job: 0 */4 * * * (every 4 hours)
  Tenants: test-pc, ds, harel, fnx
```

### Step 5: Generate a Tenant Link

In a **new terminal** (keep server running):
```bash
cd /Users/lior/Documents/TravelDash
node tools/generate-link.js harel
```

Output:
```
========================================
  Tenant Access Link Generated
========================================
Tenant:     harel
URL:        http://localhost:3000/harel/a1b2c3d4e5f6...
Expires:    9/27/2026
========================================
```

### Step 6: Open Dashboard

Copy the URL from Step 5 and open it in your browser.

The dashboard should:
- ✅ Load automatically
- ✅ Show "Loading from Jira..."
- ✅ Display data within 5-10 seconds
- ✅ Show 7 KPI cards with numbers
- ✅ Show 4 charts
- ✅ Show data table at bottom

---

## 🧪 Testing the Dashboard

### Test All Features

1. **Date Range Picker**
   - Click "Last 30d" button
   - Verify data updates
   - Try custom date range

2. **Filters**
   - Try filtering by Payer
   - Try filtering by Provider
   - Try NPI search
   - Try combining multiple filters

3. **Export CSV**
   - Click "📥 Export CSV" button
   - Check Downloads folder
   - Open CSV file to verify data

4. **Refresh**
   - Click "🔄 Refresh" button
   - Verify "Last updated" changes

5. **Table Features**
   - Click column headers to sort
   - Use search box
   - Navigate pagination

---

## 📋 Generate Links for All Tenants

```bash
# Generate links for all tenants
node tools/generate-link.js test-pc
node tools/generate-link.js ds
node tools/generate-link.js harel
node tools/generate-link.js fnx
```

Save these URLs to share with each tenant.

---

## 🔍 Monitoring

### Check Scheduled Sync

The server automatically refreshes data every 4 hours. Watch the logs:

```
[Sync Job] Starting scheduled data refresh
[Sync Job] Refreshing tenant: test-pc
[Sync Job] ✓ Refreshed test-pc: 145 records in 3.2s
...
```

### Check Cache Stats

```bash
curl http://localhost:3000/api/admin/cache-stats \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### Check Database

```bash
sqlite3 backend/data/bluespine.db "SELECT * FROM refresh_log ORDER BY timestamp DESC LIMIT 5;"
```

---

## 🚀 Push to GitHub

Your project is ready to push:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Bluespine Dashboard with Jira integration

Features:
- Node.js backend with Jira API integration
- SQLite caching (4-hour TTL)
- Secure tenant links with 90-day expiry
- Scheduled data sync (every 4 hours)
- Modern dashboard with date range picker
- CSV export functionality
- Admin CLI tools

Tech stack: Node.js, Express, SQLite, Chart.js, Vanilla JS"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/traveldash.git

# Push
git push -u origin main
```

---

## 🌐 Deploy to Production (Optional)

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

**Quick Railway Deployment:**

1. Push to GitHub (see above)
2. Go to [railway.app](https://railway.app)
3. Click **New Project** → **Deploy from GitHub**
4. Select your repository
5. Add environment variables (same as `.env`)
6. Add persistent volume for `/app/backend/data`
7. Deploy!

Railway will give you a URL like: `https://your-app.up.railway.app`

Then regenerate links with the production URL:
```bash
# In Railway, set BASE_URL environment variable
BASE_URL=https://your-app.up.railway.app

# Or manually update links to use new base URL
```

---

## 📖 Documentation

All documentation is in the `docs/` folder:

- **[SETUP.md](docs/SETUP.md)** - Detailed setup guide
- **[API.md](docs/API.md)** - Complete API reference
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Deployment instructions

Backend-specific:
- **[backend/README.md](backend/README.md)** - Backend documentation

Frontend-specific:
- **[frontend/README.md](frontend/README.md)** - Frontend documentation

---

## 🎯 Success Checklist

- [ ] Backend dependencies installed
- [ ] `.env` configured with Jira credentials
- [ ] Jira connection test passed
- [ ] Server starts without errors
- [ ] Database created at `backend/data/bluespine.db`
- [ ] Tenant link generated successfully
- [ ] Dashboard loads in browser
- [ ] Data displays correctly (KPIs, charts, table)
- [ ] All filters work
- [ ] CSV export works
- [ ] Scheduled sync job logs visible
- [ ] Links generated for all tenants
- [ ] Project pushed to GitHub

---

## ❓ Troubleshooting

### Server won't start

**Error:** `Missing required Jira environment variables`

**Solution:** Make sure `.env` file exists in `backend/` directory with all required variables.

---

### Jira connection test fails

**Error:** `Jira connection failed: Invalid credentials`

**Solution:**
1. Verify `JIRA_HOST` is just the domain (no `https://`)
2. Verify `JIRA_EMAIL` is correct
3. Generate a new API token in Jira
4. Make sure token is for Jira Cloud (not Server/Data Center)

---

### Dashboard shows "Invalid or expired access link"

**Solution:** Generate a new link:
```bash
node tools/generate-link.js <tenant>
```

---

### No data displays

**Possible causes:**
- Jira query returns no results for this tenant
- Date range filter excludes all data
- Scheduled sync hasn't run yet

**Solution:**
1. Check backend logs for Jira errors
2. Try "Reset Filters" button
3. Manually refresh: Click "🔄 Refresh"
4. Check if tenant has data in Jira

---

### Port 3000 already in use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find what's using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or change PORT in .env to something else (e.g., 3001)
```

---

## 💬 Need Help?

Check the following in order:

1. **[SETUP.md](docs/SETUP.md)** - Detailed setup instructions with troubleshooting
2. **[API.md](docs/API.md)** - API reference if you're having API issues
3. **Backend logs** - Check console output for errors
4. **Browser console** - Press F12 and check Console tab for frontend errors
5. **Database** - Check `refresh_log` table for sync errors

---

## 🎉 You're Done!

Your dashboard is ready to use! The workflow is now:

1. **One-time setup:** Generate tenant link
2. **Share:** Send link to tenant
3. **Automatic:** Data refreshes every 4 hours
4. **Manual refresh:** Tenant can click "Refresh" anytime

**Time saved:** ~10 minutes per tenant per update → ~2 seconds one-time

Enjoy your automated dashboard! 🚀
