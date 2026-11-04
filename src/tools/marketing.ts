import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shopifyGraphql } from "../shopify.js";
import { registerTool } from "../register.js";

// Read-only. Marketing activities are what apps like Shopify Email create in
// the store's Marketing section: one per campaign, with its status and dates.
// Needs the read_marketing_events scope. Open and click rates aren't
// available through this API.
const ACTIVITY_FIELDS = `
  id
  title
  status
  statusLabel
  tactic
  marketingChannelType
  sourceAndMedium
  isExternal
  createdAt
  updatedAt
  activityListUrl
  app { title }
  utmParameters { campaign source medium }
  marketingEvent { startedAt endedAt scheduledToEndAt }
`;

export function registerMarketingTools(server: McpServer): void {
  registerTool(
    server,
    "list-marketing-activities",
    "List marketing campaigns from the store's Marketing section (for example Shopify Email newsletters), newest first: " +
      "title, status (e.g. scheduled, active, sent/inactive), channel (EMAIL, SMS, SOCIAL...), tactic, the app that " +
      "created it, UTM campaign, and when it started or ended. Use it to check a campaign went out and when. " +
      "Optional Shopify search query, e.g. 'title:Black Friday', 'app_name:Shopify Email', 'created_at:>2026-11-01'. " +
      "Open and click rates aren't available here. Returns up to 25 per page; pass pageInfo.endCursor as 'after'.",
    {
      searchQuery: z
        .string()
        .optional()
        .describe("Shopify search query, e.g. 'title:Black Friday' or 'app_name:Shopify Email'"),
      limit: z.number().int().min(1).max(25).default(10).describe("Maximum number of activities to return"),
      after: z.string().optional().describe("Pagination cursor (pageInfo.endCursor from a previous call)"),
    },
    async ({ searchQuery, limit, after }) => {
      const data = await shopifyGraphql(
        `query listMarketingActivities($first: Int!, $query: String, $after: String) {
          marketingActivities(first: $first, query: $query, after: $after, sortKey: CREATED_AT, reverse: true) {
            nodes { ${ACTIVITY_FIELDS} }
            pageInfo { hasNextPage endCursor }
          }
        }`,
        { first: limit, query: searchQuery ?? null, after: after ?? null }
      );
      return {
        activities: data.marketingActivities.nodes,
        pageInfo: data.marketingActivities.pageInfo,
      };
    }
  );
}
