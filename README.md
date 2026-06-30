# Bluespine Dashboard

Automated Jira-powered dashboard for tenant claims tracking with secure per-tenant links.

## Features
- 🔄 Automatic Jira data sync (every 4 hours)
- 🔗 Secure per-tenant shareable links
- 📊 Interactive visualizations (Chart.js)
- 📅 Flexible date range filtering (30d / 90d / YTD / All)
- 📥 Export filtered data as CSV
- 🖱️ Click-to-filter on charts
- 🌙 Modern dark theme UI
- 📈 Overpayment change tracking with history table
- 💾 Save dashboard as standalone HTML (includes change history)

## Quick Start

**1. Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Jira credentials
npm start
```

**2. Generate Tenant Link**
```bash
cd backend
node tools/generate-link.js TENANT_NAME
```
Available tenants: `test-pc`, `ds`, `harel`, `fnx`

Example:
```bash
node tools/generate-link.js harel
```

**3. Open Link**
Open the generated URL in your browser.

## Documentation
- [Setup Guide](docs/SETUP.md) - Detailed setup instructions
- [API Documentation](docs/API.md) - API endpoints reference
- [Deployment Guide](docs/DEPLOYMENT.md) - Deploy to Railway/Vercel

## Project Structure
```
├── backend/       # Node.js API server
├── frontend/      # Dashboard UI
├── tools/         # Admin utilities
├── tests/         # Test suites
└── docs/          # Documentation
```

## Tech Stack
- **Backend**: Node.js, Express, SQLite
- **Frontend**: Vanilla JS, Chart.js 4.4.1
- **Scheduler**: node-cron
- **Jira**: Personal Access Token authentication

## License
Private - Bluespine Internal Use Only
