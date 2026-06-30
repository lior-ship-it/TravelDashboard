# TravelDash FAQ

## Link Management

### Is the link shareable?

**YES - Completely shareable!** ✅

The tenant links can be shared freely with anyone:
- ✅ No user or IP restrictions
- ✅ Works from any device or location  
- ✅ Multiple people can use the same link simultaneously
- ✅ Valid for 90 days from creation
- ⚠️ Anyone with the URL can access the dashboard (so only share with trusted parties)

**Example URL:**
```
http://localhost:3000/harel/90ff3c4b30847a8336cb5447654972d6f4a64dd5c544eb37268d63f8f89c58ea
```

---

### How do I generate tenant links?

You have **two methods** to generate links:

#### **Method 1: CLI Tool (Recommended for manual setup)**

Located at: [tools/generate-link.js](../backend/tools/generate-link.js)

```bash
cd /Users/lior/Documents/TravelDash/backend
node tools/generate-link.js <tenant-name>

# Example:
node tools/generate-link.js harel
```

**Output:**
- Displays the complete URL
- Shows expiration date (90 days from generation)
- Checks if tenant already has a link and offers to regenerate

#### **Method 2: Admin API (For programmatic generation)**

```bash
curl -X POST http://localhost:3000/api/admin/generate-link \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"tenant":"harel"}'
```

**Returns:**
```json
{
  "tenant": "harel",
  "token": "90ff3c4b30847a8336cb5447654972d6f4a64dd5c544eb37268d63f8f89c58ea",
  "url": "http://localhost:3000/harel/90ff3c4b30847a8336cb5447654972d6f4a64dd5c544eb37268d63f8f89c58ea",
  "expiresAt": "2026-09-27T..."
}
```

**Requirements:**
- Set `ADMIN_TOKEN` in [backend/.env](../backend/.env)
- Use this token in the `Authorization: Bearer` header

---

## Security

### Is it secure? Is my API key hidden?

**YES, Your Jira API Key is SAFE** ✅

Your Jira API credentials are **completely hidden and secure**:

#### ✅ What's Protected

1. **Jira API Key** - Stored ONLY in `backend/.env` (server-side, never sent to browser)
2. **Authentication Flow** - Backend acts as secure proxy:
   ```
   User → Tenant Token → Backend validates → Backend uses Jira API key → Fetches data → Returns claims
   ```
3. **Never Exposed** - Frontend code ([api.client.js](../frontend/dashboard/js/api.client.js)) never sees your Jira credentials
4. **Credentials Stay Server-Side** - HTTP Basic Auth header only sent from backend to Jira API

#### ⚠️ What Users Can Access

- **Only the tenant token** in the URL (e.g., `90ff3c4b30847a8336cb5447654972d6f4a64dd5c544eb37268d63f8f89c58ea`)
- This token is NOT your Jira API key - it's just an access token to your dashboard
- The token is cryptographically secure (64-char random, 256-bit entropy)

#### Link Security Summary

| Aspect | Status | Details |
|--------|--------|---------|
| **Jira API Key** | ✅ **SAFE** | Server-side only, never exposed |
| **Token Strength** | ✅ Strong | 64-char cryptographic random (256-bit) |
| **Token in URL** | ⚠️ Visible | Appears in browser history, server logs |
| **Shareability** | ⚠️ Open | Anyone with link can access (no IP/user binding) |
| **Expiration** | ✅ Yes | 90-day automatic expiry |
| **HTTPS** | ⚠️ Configure | Use HTTPS in production to encrypt tokens in transit |

#### 🔒 Best Practices for Production

1. **Use HTTPS** - Prevents token interception in transit
2. **Share links carefully** - Treat like passwords (email/Slack to trusted parties only)
3. **Monitor access** - Check `/api/admin/links` for `last_accessed` timestamps
4. **Revoke if leaked** - Use `DELETE /api/admin/link/:tenant` immediately
5. **Rotate regularly** - Regenerate links before 90-day expiry for sensitive tenants
6. **Secure .env file** - Ensure `backend/.env` has restricted permissions (`chmod 600`)

---

## Additional Admin Commands

### List All Tenant Links

```bash
curl http://localhost:3000/api/admin/links \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Returns all tenant links with status, expiration dates, and last access times.

### Revoke a Tenant Link

```bash
curl -X DELETE http://localhost:3000/api/admin/link/<tenant> \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Immediately revokes access for the specified tenant.

### Force Data Refresh

```bash
curl -X POST http://localhost:3000/api/admin/refresh/<tenant> \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Forces a fresh fetch from Jira API (bypasses 4-hour cache).

---

## Production Setup

For production deployment, set in [backend/.env](../backend/.env):

```env
# Your production domain
BASE_URL=https://yourdomain.com

# Secure admin token (generate random string)
ADMIN_TOKEN=your-secure-admin-token-here

# Jira credentials (already configured)
JIRA_HOST=bluespine.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token

# Server config
PORT=3000
NODE_ENV=production
```

This ensures:
- Generated URLs use your production domain instead of `localhost:3000`
- HTTPS encryption for token security
- Proper production environment configuration

---

## Key Files Reference

- **Link Generation**: [backend/src/services/link.service.js](../backend/src/services/link.service.js)
- **CLI Tool**: [backend/tools/generate-link.js](../backend/tools/generate-link.js)
- **Admin Routes**: [backend/src/routes/admin.routes.js](../backend/src/routes/admin.routes.js)
- **Token Validation**: [backend/src/middleware/auth.middleware.js](../backend/src/middleware/auth.middleware.js)
- **Database Schema**: [backend/src/config/database.js](../backend/src/config/database.js)
- **Frontend API Client**: [frontend/dashboard/js/api.client.js](../frontend/dashboard/js/api.client.js)
- **Jira Integration**: [backend/src/config/jira.js](../backend/src/config/jira.js)

---

## Troubleshooting

### "API Client not loaded" error
- Check that the server is running on the correct port
- Verify the tenant token is valid and not expired
- Check browser console for detailed error messages

### Token expired
- Regenerate the token using the CLI tool or admin API
- Share the new URL with users

### Data not updating
- Check the cache status with `/api/admin/cache-stats`
- Force a refresh with `/api/admin/refresh/:tenant`
- Verify the backend cron job is running (4-hour auto-refresh)

### Can't generate link
- Ensure `backend/.env` is configured with valid Jira credentials
- Check that the database file exists at the configured path
- Verify file permissions on the database file
