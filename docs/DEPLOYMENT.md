# Bluespine Dashboard - Deployment Guide

Instructions for deploying to production hosting providers.

## Overview

The Bluespine Dashboard can be deployed to various platforms:

1. **Railway** (Recommended) - Simple, includes persistent storage
2. **Vercel** - Serverless, requires external database
3. **fly.io** - Full VM control, persistent volumes
4. **Self-hosted** - Your own server/VPS

## Option 1: Railway (Recommended)

Railway provides simple deployment with persistent SQLite storage.

### Prerequisites

- GitHub account
- Railway account (free tier available)
- Code pushed to GitHub repository

### Steps

1. **Push code to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. **Create Railway project:**
- Go to [railway.app](https://railway.app)
- Click **New Project** → **Deploy from GitHub repo**
- Select your repository

3. **Configure environment variables:**

In Railway dashboard, add these variables:

```
JIRA_HOST=your-domain.atlassian.net
JIRA_EMAIL=service-account@example.com
JIRA_API_TOKEN=<your-token>
ADMIN_TOKEN=<generate-random-token>
PORT=3000
NODE_ENV=production
DATABASE_PATH=/app/data/bluespine.db
BASE_URL=https://your-app.up.railway.app
```

4. **Configure persistent volume:**
- Go to **Settings** → **Volumes**
- Click **Add Volume**
- Mount path: `/app/backend/data`
- Size: 1GB

5. **Configure start command:**
- Go to **Settings** → **Deploy**
- Root directory: `backend`
- Start command: `npm start`

6. **Deploy:**
- Railway will automatically deploy on push
- View logs to verify deployment
- Note your app URL: `https://your-app.up.railway.app`

7. **Generate tenant links:**

Use admin API:
```bash
curl -X POST https://your-app.up.railway.app/api/admin/generate-link \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"tenant": "harel"}'
```

**Cost:** Free tier includes 500 hours/month, then ~$5/month.

---

## Option 2: Vercel

Vercel is great for serverless deployment but requires replacing SQLite with PostgreSQL.

### Changes Required

1. **Replace SQLite with PostgreSQL:**
   - Update `backend/src/config/database.js` to use `pg` or `@vercel/postgres`
   - Modify all SQL queries for PostgreSQL syntax

2. **Split into Serverless Functions:**
   - Convert routes to serverless functions in `api/` directory
   - Move scheduled jobs to external cron service (e.g., Vercel Cron)

3. **Deploy:**
```bash
npm install -g vercel
vercel
```

**Cost:** Free tier generous, then ~$20/month for Pro.

---

## Option 3: fly.io

Fly.io provides full VM control with persistent volumes.

### Steps

1. **Install flyctl:**
```bash
curl -L https://fly.io/install.sh | sh
```

2. **Create fly.toml:**
```toml
app = "bluespine-dashboard"

[build]
  builder = "heroku/buildpacks:20"

[env]
  PORT = "8080"
  NODE_ENV = "production"

[[services]]
  http_checks = []
  internal_port = 8080
  processes = ["app"]
  protocol = "tcp"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

[mounts]
  source = "bluespine_data"
  destination = "/app/backend/data"
```

3. **Deploy:**
```bash
fly launch
fly secrets set JIRA_HOST=<your-host>
fly secrets set JIRA_EMAIL=<your-email>
fly secrets set JIRA_API_TOKEN=<your-token>
fly secrets set ADMIN_TOKEN=<random-token>
fly deploy
```

4. **Create persistent volume:**
```bash
fly volumes create bluespine_data --size 1
```

**Cost:** Free tier includes 3 VMs, then ~$2-5/month.

---

## Option 4: Self-Hosted (VPS)

Deploy on your own server or VPS (DigitalOcean, Linode, AWS EC2, etc.).

### Prerequisites

- Ubuntu/Debian server with SSH access
- Node.js 18+ installed
- Nginx (for reverse proxy)
- PM2 (for process management)

### Steps

1. **Install Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Install PM2:**
```bash
sudo npm install -g pm2
```

3. **Clone repository:**
```bash
cd /var/www
git clone <your-repo-url> bluespine-dashboard
cd bluespine-dashboard/backend
```

4. **Install dependencies:**
```bash
npm install --production
```

5. **Configure environment:**
```bash
cp .env.example .env
nano .env  # Edit with your credentials
```

6. **Start with PM2:**
```bash
pm2 start src/server.js --name bluespine-api
pm2 save
pm2 startup  # Follow instructions to auto-start on boot
```

7. **Configure Nginx reverse proxy:**
```nginx
server {
    listen 80;
    server_name dashboard.bluespine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

8. **Enable HTTPS with Let's Encrypt:**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d dashboard.bluespine.com
```

9. **Monitor logs:**
```bash
pm2 logs bluespine-api
```

**Cost:** $5-20/month depending on VPS provider and specs.

---

## Post-Deployment Checklist

After deploying to any platform:

### 1. Test Health Endpoint
```bash
curl https://your-domain.com/api/health
```

### 2. Generate Tenant Links
```bash
curl -X POST https://your-domain.com/api/admin/generate-link \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"tenant": "harel"}'
```

### 3. Test Tenant Dashboard
Open generated link in browser and verify:
- Dashboard loads
- Data displays correctly
- Charts render
- Filters work

### 4. Verify Scheduled Jobs
Check logs for scheduled sync job:
```
[Sync Job] Starting scheduled data refresh
```

### 5. Monitor Performance
- Check response times
- Monitor memory usage
- Set up uptime monitoring (UptimeRobot, Pingdom)

### 6. Set Up Backups
**Railway/fly.io:**
- Schedule daily volume snapshots

**Self-hosted:**
```bash
# Add to crontab
0 2 * * * /usr/bin/sqlite3 /var/www/bluespine-dashboard/backend/data/bluespine.db ".backup '/backups/bluespine-$(date +\%Y\%m\%d).db'"
```

### 7. Configure Logging
- Set up log aggregation (Papertrail, Logtail)
- Monitor error rates
- Set up alerts for failures

---

## Environment-Specific Configuration

### Development
```env
NODE_ENV=development
BASE_URL=http://localhost:3000
```

### Production
```env
NODE_ENV=production
BASE_URL=https://dashboard.bluespine.com
```

---

## Updating After Deployment

### Railway
Push to GitHub main branch - auto-deploys.

### Vercel
```bash
vercel --prod
```

### fly.io
```bash
fly deploy
```

### Self-hosted
```bash
cd /var/www/bluespine-dashboard
git pull
cd backend && npm install --production
pm2 restart bluespine-api
```

---

## Troubleshooting

### Issue: "Database locked" errors

**Solution:** SQLite doesn't handle high concurrency well. Consider:
- Reducing scheduled sync frequency
- Upgrading to PostgreSQL
- Enabling WAL mode (already enabled in our config)

### Issue: Scheduled jobs not running

**Railway/fly.io:** Ensure your dyno/VM doesn't sleep. Use paid tier.

**Vercel:** Move scheduled jobs to Vercel Cron or external service.

### Issue: High memory usage

**Solution:**
- Limit Jira pagination (reduce maxResults)
- Clear old cache data periodically
- Upgrade to larger instance

---

## Security Best Practices

1. **Never commit `.env` files** - Use secrets management
2. **Rotate ADMIN_TOKEN regularly** - Every 90 days
3. **Use HTTPS only** - Force redirect from HTTP
4. **Limit admin API access** - IP whitelist if possible
5. **Monitor access logs** - Alert on suspicious patterns
6. **Keep dependencies updated** - Run `npm audit` regularly

---

## Cost Comparison

| Platform | Free Tier | Paid Tier | Best For |
|----------|-----------|-----------|----------|
| **Railway** | 500 hrs/mo | $5-20/mo | Simple deployment, SQLite |
| **Vercel** | Generous | $20/mo | Serverless, high scale |
| **fly.io** | 3 VMs free | $2-5/mo | Full control, low cost |
| **Self-hosted** | N/A | $5-20/mo | Maximum control |

**Recommendation:** Start with Railway, migrate to self-hosted or fly.io if scaling needs grow.
