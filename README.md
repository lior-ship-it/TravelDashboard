# Bluespine Dashboard

Automated Jira-powered dashboard for tenant claims tracking with secure per-tenant links.

## Features
- 🔄 Automatic Jira data sync (every 4 hours) + manual refresh button
- 🔗 Secure per-tenant shareable links
- 📊 Interactive visualizations (Chart.js)
- 📅 Month dropdown filter + quick-range buttons (Last Month / Last Quarter / YTD / All)
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

**Auto-start (macOS):**  
The server runs as a LaunchAgent — starts on login, restarts if it crashes.
```bash
# Status
launchctl list | grep traveldash

# Manual stop/start
launchctl stop com.traveldash.server
launchctl start com.traveldash.server

# Remove auto-start
launchctl unload ~/Library/LaunchAgents/com.traveldash.server.plist
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
