# Bluespine Dashboard - API Documentation

Complete API reference for the Bluespine Dashboard backend.

## Base URL

```
http://localhost:3000/api
```

## Authentication

### Public Endpoints

Public API endpoints use **tenant access tokens** embedded in the URL path.

```
GET /api/data/:tenant/:token
```

### Admin Endpoints

Admin API endpoints require an **Authorization header**:

```
Authorization: Bearer <ADMIN_TOKEN>
```

The `ADMIN_TOKEN` is configured in the backend `.env` file.

---

## Public API

### Health Check

Check server status.

**Endpoint:** `GET /api/health`

**Authentication:** None

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-29T10:00:00.000Z",
  "environment": "development"
}
```

---

### Get Tenant Data

Fetch claims data for a specific tenant. Returns cached data if available and fresh (< 4 hours old), otherwise fetches from Jira.

**Endpoint:** `GET /api/data/:tenant/:token`

**Authentication:** Tenant access token (in URL)

**Parameters:**
- `tenant` (path) - Tenant identifier (e.g., `harel`, `test-pc`)
- `token` (path) - 64-character access token

**Response:**
```json
{
  "claims": [
    {
      "Issue key": "CLAIMS-123",
      "Summary": "Claim description",
      "Status": "Done",
      "Created": "2026-05-15T10:30:00.000Z",
      "Total Allowed": "1500.00",
      "Total Overpayment": "300.00",
      "Provider": "Dr. Smith",
      "Provider NPI": "1234567890",
      "Payer": "Insurance Co",
      "Patient ID": "P123456",
      "Tenant-Alias": "harel",
      ...
    }
  ],
  "lastFetched": "2026-06-29T10:00:00.000Z",
  "fromCache": true
}
```

**Error Responses:**

**400 Bad Request** - Missing parameters
```json
{
  "error": "Missing tenant or token parameter"
}
```

**401 Unauthorized** - Invalid or expired token
```json
{
  "error": "Invalid or expired access token",
  "message": "Please contact your administrator for a new link."
}
```

**500 Internal Server Error** - Jira API failure
```json
{
  "error": "Failed to fetch Jira data"
}
```

---

## Admin API

All admin endpoints require authentication.

### Generate Tenant Link

Create a new secure access link for a tenant. If a link already exists, it will be replaced.

**Endpoint:** `POST /api/admin/generate-link`

**Authentication:** Bearer token (Admin)

**Headers:**
```
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "tenant": "harel"
}
```

**Response:**
```json
{
  "tenant": "harel",
  "token": "a1b2c3d4e5f6...",
  "url": "http://localhost:3000/harel/a1b2c3d4e5f6...",
  "expiresAt": "2026-09-27T10:00:00.000Z"
}
```

**Error Responses:**

**400 Bad Request** - Missing tenant
```json
{
  "error": "Missing tenant parameter"
}
```

**401 Unauthorized** - Missing or invalid Authorization header
```json
{
  "error": "Missing or invalid Authorization header",
  "message": "Expected: Authorization: Bearer <ADMIN_TOKEN>"
}
```

**403 Forbidden** - Invalid admin token
```json
{
  "error": "Invalid admin token"
}
```

---

### List All Tenant Links

Get all tenant access links with their status.

**Endpoint:** `GET /api/admin/links`

**Authentication:** Bearer token (Admin)

**Headers:**
```
Authorization: Bearer <ADMIN_TOKEN>
```

**Response:**
```json
{
  "links": [
    {
      "tenant": "harel",
      "url": "http://localhost:3000/harel/a1b2c3d4...",
      "expiresAt": "2026-09-27T10:00:00.000Z",
      "lastAccessed": "2026-06-29T09:30:00.000Z",
      "createdAt": "2026-06-01T12:00:00.000Z",
      "isExpired": false
    },
    {
      "tenant": "test-pc",
      "url": "http://localhost:3000/test-pc/x1y2z3...",
      "expiresAt": "2026-08-15T10:00:00.000Z",
      "lastAccessed": null,
      "createdAt": "2026-05-20T14:00:00.000Z",
      "isExpired": false
    }
  ]
}
```

---

### Revoke Tenant Link

Delete a tenant's access link, immediately invalidating it.

**Endpoint:** `DELETE /api/admin/link/:tenant`

**Authentication:** Bearer token (Admin)

**Parameters:**
- `tenant` (path) - Tenant identifier

**Headers:**
```
Authorization: Bearer <ADMIN_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "message": "Link revoked for tenant: harel"
}
```

**Error Responses:**

**404 Not Found** - Tenant link doesn't exist
```json
{
  "error": "Tenant link not found"
}
```

---

### Manual Data Refresh

Force an immediate refresh of tenant data from Jira, bypassing cache.

**Endpoint:** `POST /api/admin/refresh/:tenant`

**Authentication:** Bearer token (Admin)

**Parameters:**
- `tenant` (path) - Tenant identifier

**Headers:**
```
Authorization: Bearer <ADMIN_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "tenant": "harel",
  "recordsFetched": 145,
  "lastFetched": "2026-06-29T10:00:00.000Z"
}
```

**Error Responses:**

**500 Internal Server Error** - Jira API failure
```json
{
  "error": "Failed to fetch Jira data: <error message>"
}
```

---

### Cache Statistics

Get statistics about cached data for all tenants.

**Endpoint:** `GET /api/admin/cache-stats`

**Authentication:** Bearer token (Admin)

**Headers:**
```
Authorization: Bearer <ADMIN_TOKEN>
```

**Response:**
```json
{
  "stats": [
    {
      "tenant": "harel",
      "record_count": 145,
      "last_fetch": "2026-06-29T08:00:00.000Z",
      "oldest_claim": "2026-03-01T10:00:00.000Z",
      "newest_claim": "2026-06-28T16:30:00.000Z",
      "age_minutes": 120,
      "is_fresh": true
    },
    {
      "tenant": "test-pc",
      "record_count": 89,
      "last_fetch": "2026-06-29T04:00:00.000Z",
      "oldest_claim": "2026-03-15T12:00:00.000Z",
      "newest_claim": "2026-06-27T14:00:00.000Z",
      "age_minutes": 360,
      "is_fresh": false
    }
  ]
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding rate limiting for production deployments:

- Public API: 100 requests/hour per token
- Admin API: 1000 requests/hour per admin token

## CORS

CORS is enabled for all origins in development. For production, restrict to your domain:

```javascript
app.use(cors({
  origin: 'https://dashboard.bluespine.com',
  credentials: true
}));
```

## Error Handling

All errors follow this format:

```json
{
  "error": "Error message",
  "message": "Optional user-friendly message",
  "stack": "Stack trace (development only)"
}
```

HTTP status codes:
- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid/missing auth)
- `403` - Forbidden (valid auth but insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Webhook Support (Future)

Future versions may support webhooks for real-time updates:

```
POST /api/webhook/jira
```

This would allow Jira to push updates automatically instead of polling.
