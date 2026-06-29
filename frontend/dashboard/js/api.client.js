/**
 * API Client for Bluespine Dashboard
 * Handles communication with the backend API
 */

class APIClient {
  constructor() {
    this.baseURL = window.location.origin;
    this.tenant = null;
    this.token = null;
    this.lastFetched = null;
  }

  /**
   * Initialize from URL path
   * Expected format: /:tenant/:token
   */
  init() {
    console.log('Initializing API Client...');
    console.log('Current URL:', window.location.href);
    console.log('Pathname:', window.location.pathname);

    const pathParts = window.location.pathname.split('/').filter(p => p);
    console.log('Path parts:', pathParts);
    console.log('Path parts length:', pathParts.length);

    if (pathParts.length >= 2) {
      this.tenant = pathParts[0];
      this.token = pathParts[1];
      console.log(`✅ API Client initialized for tenant: ${this.tenant}`);
      console.log(`Token: ${this.token.substring(0, 20)}...`);
      return true;
    }

    console.error('❌ Invalid URL format. Expected: /:tenant/:token');
    console.error(`Got ${pathParts.length} parts:`, pathParts);
    return false;
  }

  /**
   * Fetch tenant data from API
   * Returns: { claims: [], lastFetched: ISO date, fromCache: boolean }
   */
  async fetchData() {
    if (!this.tenant || !this.token) {
      throw new Error('API client not initialized');
    }

    const url = `${this.baseURL}/api/data/${this.tenant}/${this.token}`;

    console.log(`Fetching data from API...`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('INVALID_TOKEN');
        } else if (response.status === 400) {
          throw new Error('BAD_REQUEST');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();

      this.lastFetched = data.lastFetched;

      console.log(`✓ Fetched ${data.claims.length} claims`);
      console.log(`  Last updated: ${new Date(data.lastFetched).toLocaleString()}`);
      console.log(`  From cache: ${data.fromCache}`);

      return data;

    } catch (error) {
      console.error('API Error:', error.message);
      throw error;
    }
  }

  /**
   * Get formatted "last updated" string
   */
  getLastUpdatedText() {
    if (!this.lastFetched) return 'Never';

    const date = new Date(this.lastFetched);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  }

  /**
   * Get tenant name
   */
  getTenantName() {
    const names = {
      'test-pc': 'PassportCard Travel',
      'ds': 'DavidShield (PassportCard Relocation)',
      'harel': 'Harel',
      'fnx': 'FNX'
    };
    return names[this.tenant] || this.tenant || 'Unknown';
  }
}

// Create global instance
window.apiClient = new APIClient();
