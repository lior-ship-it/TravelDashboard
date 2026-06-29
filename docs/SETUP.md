# Bluespine Dashboard - Setup Guide

Complete setup instructions for local development and production deployment.

## Prerequisites

- Node.js 18+ LTS
- npm 9+
- Jira Personal Access Token
- Git (for version control)

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd TravelDash
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Jira Configuration
JIRA_HOST=your-domain.atlassian.net
JIRA_EMAIL=service-account@example.com
JIRA_API_TOKEN=your_personal_access_token

# Server Configuration
PORT=3000
NODE_ENV=development

# Admin Authentication
ADMIN_TOKEN=<generate-random-token>

# Database
DATABASE_PATH=./data/bluespine.db
```

**To generate a secure `ADMIN_TOKEN`:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Get Jira Personal Access Token

1. Log in to Jira
2. Go to: **Account Settings** → **Security** → **Create and manage API tokens**
3. Click **Create API token**
4. Copy the token and add it to `.env`

### 5. Test Jira Connection

```bash
node ../tools/test-jira-connection.js
```

You should see:
```
✅ Jira connection test passed!
```

### 6. Start Backend Server

```bash
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

### 7. Generate Tenant Links

```bash
# From project root
node tools/generate-link.js harel
```

Output:
```
========================================
  Tenant Access Link Generated
========================================
Tenant:     harel
URL:        http://localhost:3000/harel/a1b2c3d4...
Expires:    9/27/2026
========================================
```

### 8. Open Dashboard

Open the generated URL in your browser. The dashboard should load with data from Jira.

## Troubleshooting

### Issue: "Missing required Jira environment variables"

**Solution:** Make sure `.env` file exists in `backend/` directory with all required variables.

### Issue: "Jira connection failed"

**Possible causes:**
- Invalid Jira credentials
- Network/firewall blocking connection
- Incorrect JIRA_HOST format

**Solution:**
1. Verify credentials in Jira web interface
2. Check JIRA_HOST is just the domain (no `https://`)
3. Test connection: `node tools/test-jira-connection.js`

### Issue: "SQLITE_CANTOPEN: unable to open database"

**Solution:** Create the data directory:
```bash
mkdir -p backend/data
```

### Issue: "Port 3000 already in use"

**Solution:** Change PORT in `.env` or kill the process:
```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Issue: "Invalid or expired access token"

**Solution:** Generate a new link:
```bash
node tools/generate-link.js <tenant>
```

## Development Workflow

### Run with Auto-Reload

```bash
cd backend
npm run dev
```

Uses `nodemon` to automatically restart server on file changes.

### Manual Data Refresh

```bash
curl -X POST http://localhost:3000/api/admin/refresh/harel \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### View Cache Stats

```bash
curl http://localhost:3000/api/admin/cache-stats \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### View All Tenant Links

```bash
curl http://localhost:3000/api/admin/links \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for hosting instructions.

## Next Steps

- Customize tenant rates in `backend/src/services/jira.service.js`
- Add more tenants to sync job in `backend/src/jobs/data-sync.job.js`
- Customize dashboard UI in `frontend/dashboard/`
- Set up monitoring and logging
