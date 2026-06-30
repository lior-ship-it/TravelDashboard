# Deploy TravelDash to Render.com

## Why Render?

The user sent a TravelDash tenant link (`http://localhost:3000/harel/...`) to someone else, but it doesn't work because `localhost` only works on the user's local machine. We need to deploy the backend to a publicly accessible server so the links can be shared with anyone.

**Why Render?**
- ✅ Free tier available
- ✅ Supports Node.js + SQLite with persistent storage
- ✅ Auto-deploys from GitHub
- ✅ Gives a public HTTPS URL
- ✅ No credit card required for free tier

---

## Quick Start (5 Steps)

1. Create `render.yaml` in project root
2. Commit and push to GitHub
3. Sign up on Render and connect GitHub repo
4. Set environment variables in Render dashboard
5. Deploy and get your public URL

---

## Detailed Implementation Steps

### Step 1: Create Render Configuration

Create [render.yaml](../render.yaml) in the **ROOT** directory (not backend/):

```yaml
services:
  - type: web
    name: traveldash
    runtime: node
    rootDir: backend
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_PATH
        value: /opt/render/project/data/bluespine.db
      - key: JIRA_HOST
        sync: false
      - key: JIRA_EMAIL
        sync: false
      - key: JIRA_API_TOKEN
        sync: false
      - key: ADMIN_TOKEN
        sync: false
      - key: BASE_URL
        sync: false
    disk:
      name: traveldash-db
      mountPath: /opt/render/project/data
      sizeGB: 1
```

**Key Configuration:**
- **rootDir: backend** - Run commands from backend/ subdirectory
- **disk** - Persistent volume for SQLite database (1GB)
- **envVars with `sync: false`** - These must be set manually in Render dashboard

---

### Step 2: Commit and Push to GitHub

```bash
# From project root
git add render.yaml docs/FAQ.md
git commit -m "Add Render deployment configuration"
git push origin main
```

**Verify:**
- GitHub repo: https://github.com/lior-ship-it/TravelDashboard
- `.env` is NOT committed (check .gitignore)

---

### Step 3: Deploy on Render

#### 3.1 Create Render Account
1. Go to https://render.com/
2. Sign up with GitHub account (recommended)
3. No credit card required for free tier

#### 3.2 Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect GitHub repository: `lior-ship-it/TravelDashboard`
3. Render should auto-detect `render.yaml` and pre-fill settings
4. If not auto-detected, configure manually:
   - **Name**: `traveldash`
   - **Region**: Choose closest to users
   - **Branch**: `main`
   - **Root Directory**: Leave blank (render.yaml specifies `rootDir: backend`)
   - **Runtime**: Node
   - **Build Command**: `npm install` (from render.yaml)
   - **Start Command**: `npm start` (from render.yaml)
   - **Instance Type**: Free

#### 3.3 Configure Environment Variables

In Render dashboard, add these **secret** environment variables:

| Key | Value | Source |
|-----|-------|--------|
| `BASE_URL` | `https://traveldash.onrender.com` | Your Render URL (update after first deploy) |
| `JIRA_HOST` | `bluespine.atlassian.net` | From backend/.env |
| `JIRA_EMAIL` | `<your-jira-email>` | From backend/.env |
| `JIRA_API_TOKEN` | `<your-jira-token>` | From backend/.env |
| `ADMIN_TOKEN` | `<your-admin-token>` | From backend/.env |

**Note:** `NODE_ENV` and `DATABASE_PATH` are already set in render.yaml - don't add them again.

#### 3.4 Verify Persistent Disk

The disk is auto-configured via `render.yaml`. Verify in dashboard:
- Go to service → **"Disks"** tab
- Confirm disk `traveldash-db` is mounted at `/opt/render/project/data`
- Size: 1 GB (free tier)

#### 3.5 Deploy!

Click **"Create Web Service"** - Render will:
1. Clone your GitHub repo
2. Run `npm install` in `backend/` directory
3. Start the server with `npm start`
4. Give you a URL like: `https://traveldash.onrender.com`

**First deploy takes ~2-3 minutes.**

---

### Step 4: Update BASE_URL

After first deployment, you'll have your public URL.

1. Go to Render dashboard → **Environment** tab
2. Update `BASE_URL` to your actual URL (e.g., `https://traveldash.onrender.com`)
3. Click **"Save Changes"** (triggers automatic redeploy)

---

### Step 5: Generate New Tenant Links

Now regenerate tenant links with the public URL.

#### Option A: Via Admin API (Recommended)

```bash
curl -X POST https://traveldash.onrender.com/api/admin/generate-link \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"tenant":"harel"}'
```

**Response:**
```json
{
  "tenant": "harel",
  "token": "90ff3c4b30847a8336cb5447654972d6f4a64dd5c544eb37268d63f8f89c58ea",
  "url": "https://traveldash.onrender.com/harel/90ff3c4b30...",
  "expiresAt": "2026-09-27T..."
}
```

#### Option B: Via CLI Tool

```bash
export BASE_URL=https://traveldash.onrender.com
node tools/generate-link.js harel
```

---

### Step 6: Test and Share

#### Test the Deployment

1. **Open the link** in your browser: `https://traveldash.onrender.com/harel/<token>`
2. **Verify data loads**: Dashboard should show 24 claims from Jira
3. **Test filters**: Try filtering by payer, provider, date range
4. **Test from different device**: Open on phone or different computer

#### Share the Link

The new link works from **anywhere**:
- ✅ Share via email, Slack, Teams
- ✅ Works on any device
- ✅ No VPN or network restrictions
- ✅ Valid for 90 days

**Example link to share:**
```
https://traveldash.onrender.com/harel/90ff3c4b30847a8336cb5447654972d6f4a64dd5c544eb37268d63f8f89c58ea
```

---

## Important: Free Tier Limitations

### Cold Starts (15-minute inactivity)

Render's free tier spins down your service after **15 minutes of inactivity**.

**What this means:**
- First request after idle takes ~30 seconds to respond (cold start)
- Subsequent requests are fast
- Happens automatically, no data loss

**Workaround options:**
1. **Accept the delay** (free, simple)
2. **Upgrade to paid tier** ($7/month for always-on)
3. **Use a ping service** - cron-job.org to ping every 10 minutes (keeps it warm)

---

## Verification Checklist

After deployment, verify:

- ✅ **Service running**: Green status in Render dashboard
- ✅ **Logs clean**: No errors in Render logs
- ✅ **Database initialized**: Logs show "Database initialized successfully"
- ✅ **Public URL accessible**: Dashboard loads from any device
- ✅ **Jira data loads**: Dashboard shows claims data
- ✅ **Filters work**: Can filter by payer, provider, date
- ✅ **Token validation**: Invalid tokens return 401 error
- ✅ **Admin API works**: Can generate new links

---

## Troubleshooting

### Issue: "Database locked" errors

**Cause**: SQLite concurrency issues
**Solution**: Database already uses WAL mode. If persists:
- Check disk is properly mounted
- Verify `DATABASE_PATH` points to persistent disk

### Issue: "API Client not loaded" error

**Cause**: Environment variables not set
**Solution**:
1. Check Render dashboard → Environment tab
2. Verify all required vars are set
3. Trigger manual deploy

### Issue: Cold start delays

**Symptom**: First request takes 30+ seconds
**Cause**: Free tier spins down after 15 min
**Solution**: Accept delay or upgrade to paid tier

### Issue: Stale data

**Cause**: Cache not refreshing
**Solution**: Force refresh via admin API:
```bash
curl -X POST https://traveldash.onrender.com/api/admin/refresh/harel \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### Issue: Generated links still show localhost

**Cause**: `BASE_URL` not updated
**Solution**: Update `BASE_URL` in Render environment variables

---

## Monitoring & Maintenance

### View Logs

Render dashboard → **Logs** tab - Real-time log streaming

### Check Service Health

```bash
curl https://traveldash.onrender.com/api/health
```

### Monitor Database Size

```bash
curl https://traveldash.onrender.com/api/admin/cache-stats \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### List All Tenant Links

```bash
curl https://traveldash.onrender.com/api/admin/links \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

---

## Cost Summary

### Free Tier (Recommended for MVP)
- **Cost**: $0/month
- **Compute**: 750 hours/month
- **Storage**: 1 GB persistent disk
- **Limitation**: Spins down after 15 min idle
- **Good for**: Testing, low-traffic internal dashboards

### Paid Tier (Production)
- **Cost**: $7/month
- **Always on**: No cold starts
- **Better for**: Production use with regular traffic

---

## Updating Your Deployment

### Auto-Deploy (Recommended)

Render auto-deploys when you push to GitHub:

```bash
git add .
git commit -m "Update feature"
git push origin main
# Render deploys automatically
```

### Manual Deploy

In Render dashboard:
- Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## Alternative: Quick Test with ngrok

Before committing to Render, test sharing locally:

```bash
# Install ngrok
brew install ngrok

# Expose local server
ngrok http 3000

# Use ngrok URL temporarily
# Example: https://abc123.ngrok.io
```

**Note**: ngrok URLs change on each restart. Use Render for permanent sharing.

---

## Next Steps

After successful deployment:

1. ✅ Share new public links with users
2. ✅ Update documentation with production URL
3. ✅ Set up monitoring/alerts (optional)
4. ✅ Schedule regular link rotation (every 90 days)
5. ✅ Consider upgrading to paid tier if cold starts are an issue

---

## Support

- **Render Docs**: https://render.com/docs
- **TravelDash FAQ**: [FAQ.md](FAQ.md)
- **Deployment Options**: [DEPLOYMENT.md](DEPLOYMENT.md) (Railway, fly.io, Vercel)

---

## Comparison with Other Platforms

| Platform | Free Tier | Cold Starts | SQLite Support | Ease |
|----------|-----------|-------------|----------------|------|
| **Render** | ✅ 750 hrs/mo | Yes (15 min) | ✅ Via disk | Easy |
| **Railway** | ✅ $5 credit | No | ✅ Via volume | Easy |
| **fly.io** | ✅ 3 VMs | No | ✅ Via volume | Medium |
| **Vercel** | ✅ Generous | No | ❌ Need external DB | Hard |

**Recommendation**: Start with Render (this guide) or Railway (see [DEPLOYMENT.md](DEPLOYMENT.md)). Both are excellent for this use case.
