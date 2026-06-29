# Bluespine Dashboard Backend

Node.js API server with Jira integration, SQLite caching, and tenant link management.

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your Jira credentials
```

3. **Start server:**
```bash
npm start
```

Server will run on `http://localhost:3000`

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JIRA_HOST` | Jira domain | `your-domain.atlassian.net` |
| `JIRA_EMAIL` | Service account email | `service@example.com` |
| `JIRA_API_TOKEN` | Personal Access Token | Generated from Jira |
| `ADMIN_TOKEN` | Admin API authentication | Random secure string |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` or `production` |

## API Endpoints

### Public API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | None | Health check |
| `/api/data/:tenant/:token` | GET | Token | Get tenant data (cached) |

### Admin API

Requires `Authorization: Bearer <ADMIN_TOKEN>` header.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/generate-link` | POST | Generate tenant access link |
| `/api/admin/links` | GET | List all tenant links |
| `/api/admin/link/:tenant` | DELETE | Revoke a tenant link |
| `/api/admin/refresh/:tenant` | POST | Manually refresh tenant data |
| `/api/admin/cache-stats` | GET | Get cache statistics |

## Scheduled Jobs

- **Data Sync**: Runs every 4 hours (`0 */4 * * *`)
- Refreshes data for all tenants: `test-pc`, `ds`, `harel`, `fnx`
- Logs to `refresh_log` table in database

## Database

SQLite database stored at `backend/data/bluespine.db`

**Tables:**
- `claims` - Cached Jira claims data per tenant
- `tenant_links` - Tenant access tokens and expiry
- `refresh_log` - Data refresh audit trail

## Development

**Run with auto-reload:**
```bash
npm run dev
```

**Test Jira connection:**
```bash
node ../tools/test-jira-connection.js
```

**Generate tenant link:**
```bash
node ../tools/generate-link.js harel
```

## Caching Strategy

- Data cached for 4 hours
- Automatic refresh via cron job
- Manual refresh available via admin API
- Falls back to Jira API if cache stale/missing
