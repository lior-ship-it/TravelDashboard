# Tenant Access Links

## Active Links

| Tenant | Link | Created | Expires |
|--------|------|---------|---------|
| ds | `http://localhost:3000/ds/a529e7cd221ef5777cd24c61eb8a92d5ed79b5aa328ae839137edb67817d950a` | 2026-06-29 | 2026-09-27 |
| harel | `http://localhost:3000/harel/90ff3c4b30847a8336cb5447654972d6f4a64dd5c544eb37268d63f8f89c58ea` | 2026-06-29 | 2026-09-27 |
| test-pc | `http://localhost:3000/test-pc/7a245aa5ffa8f72b3562dfe657bdfc462fa10bc1494dec122a9323cdf6ad1b9b` | 2026-06-29 | 2026-09-27 |

## Regenerating Links

From the project root:
```bash
cd backend
node tools/generate-link.js TENANT_NAME
```

Available tenants: `test-pc`, `ds`, `harel`, `fnx`

Links expire after 90 days. Running the command for an existing tenant will replace the old link.
