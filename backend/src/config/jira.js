/**
 * Jira API v3 Client using native fetch
 * Replaces outdated jira-client library
 */

function createJiraClient() {
  if (!process.env.JIRA_HOST || !process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
    throw new Error('Missing required Jira environment variables: JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN');
  }

  const host = process.env.JIRA_HOST;
  const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
  const baseUrl = `https://${host}/rest/api/3`;

  return {
    /**
     * Search for issues using JQL
     * @param {string} jql - JQL query string
     * @param {object} options - Search options (startAt, maxResults, fields)
     * @returns {Promise<object>} Search results with issues array and total count
     */
    async searchJira(jql, options = {}) {
      const { startAt = 0, maxResults = 100 } = options;

      // Step 1: Get issue IDs using /search/jql (new endpoint)
      const searchUrl = `${baseUrl}/search/jql`;

      const searchResponse = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jql })
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        throw new Error(`Jira API error ${searchResponse.status}: ${errorText}`);
      }

      const searchData = await searchResponse.json();
      const issueIds = searchData.issues || [];

      // If no issues found, return empty result
      if (issueIds.length === 0) {
        return {
          issues: [],
          total: 0,
          startAt: 0,
          maxResults
        };
      }

      // Step 2: Fetch full issue details for the issue IDs
      // Apply pagination limits
      const limitedIds = issueIds.slice(startAt, startAt + maxResults);
      const issueKeys = limitedIds.map(issue => issue.id);

      // Fetch all issues in parallel
      const fullIssues = await Promise.all(
        limitedIds.map(issue => this.getIssue(issue.id))
      );

      return {
        issues: fullIssues,
        total: issueIds.length,
        startAt,
        maxResults
      };
    },

    /**
     * Get a single issue by key or ID
     * @param {string} issueKeyOrId - Issue key (e.g., "PROJ-123") or ID (e.g., "12345")
     * @returns {Promise<object>} Issue data
     */
    async getIssue(issueKeyOrId) {
      const url = `${baseUrl}/issue/${issueKeyOrId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jira API error ${response.status}: ${errorText}`);
      }

      return await response.json();
    }
  };
}

module.exports = { createJiraClient };
