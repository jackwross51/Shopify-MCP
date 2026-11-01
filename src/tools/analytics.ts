import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { shopifyGraphql, ShopifyError } from "../shopify.js";
import { registerTool } from "../register.js";

// ShopifyQL in the Admin API requires 2025-10 or later. Only this tool uses the
// newer version, so the existing tools keep the version they were written for.
const ANALYTICS_API_VERSION = "2026-04";

export function registerAnalyticsTools(server: McpServer): void {
  registerTool(
    server,
    "run-shopifyql",
    "Run a read-only ShopifyQL query against the store's analytics — the same data behind " +
      "Shopify Analytics reports (sales, orders, AOV, returns, products, customers, sessions, " +
      "conversion, by day/week/month, channel, location, product, discount, etc.). " +
      "Example: FROM sales SHOW total_sales, orders, average_order_value " +
      "GROUP BY product_title SINCE -30d ORDER BY total_sales DESC LIMIT 20. " +
      "Use TIMESERIES day|week|month for trends and COMPARE TO previous_period for comparisons. " +
      "Requires the read_reports scope and Level 2 protected customer data access.",
    {
      query: z.string().min(1).describe("A ShopifyQL query, e.g. FROM sales SHOW total_sales SINCE -7d"),
    },
    async ({ query }: { query: string }) => {
      const data = await shopifyGraphql(
        `query runShopifyql($query: String!) {
          shopifyqlQuery(query: $query) {
            tableData { columns { name dataType displayName } rows }
            parseErrors
          }
        }`,
        { query },
        ANALYTICS_API_VERSION
      );
      const result = data.shopifyqlQuery;
      if (result?.parseErrors?.length) {
        throw new ShopifyError(`ShopifyQL parse error: ${JSON.stringify(result.parseErrors)}`);
      }
      return result?.tableData ?? result;
    }
  );
}
