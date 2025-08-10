/**
 * Analytics API route using CDP Data SQL API
 * Provides real-time payment and revenue analytics for Wish platform
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface PaymentAnalytics {
  dailyRevenue: Array<{
    date: string;
    transactions: number;
    revenue_eth: number;
    unique_users: number;
  }>;
  recentPayments: Array<{
    transaction_hash: string;
    from_address: string;
    timestamp: string;
    amount_eth: number;
  }>;
  topUsers: Array<{
    wallet_address: string;
    query_count: number;
    total_paid_eth: number;
  }>;
}

interface SQLResponse {
  data?: unknown[];
}

/**
 * Execute SQL query against CDP Data API
 */
async function executeSQL(query: string): Promise<SQLResponse> {
  const response = await fetch("https://api.cdp.coinbase.com/platform/v2/data/query/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.CDP_API_KEY_SECRET}`,
    },
    body: JSON.stringify({ sql: query }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("CDP Data API Error:", response.status, response.statusText, errorText);
    throw new Error(`SQL API error: ${response.statusText} - ${errorText}`);
  }

  return await response.json() as SQLResponse;
}

/**
 * GET handler for payment analytics
 */
export async function GET(_req: NextRequest) {
  try {
    const wishWalletAddress = process.env.WISH_WALLET_ADDRESS || process.env.NEXT_PUBLIC_WISH_WALLET_ADDRESS;
    
    if (!wishWalletAddress) {
      return NextResponse.json(
        { error: "Wish wallet address not configured" },
        { status: 500 }
      );
    }

    // Daily revenue query using CDP Data API format
    const dailyRevenueQuery = `
      SELECT 
        toDate(fromUnixTimestamp(block_timestamp)) as payment_date,
        COUNT(*) as transactions_count,
        SUM(toFloat64(value) / 1e18) as daily_revenue_eth,
        COUNT(DISTINCT from_address) as unique_users
      FROM base_sepolia.transactions
      WHERE to_address = '${wishWalletAddress.toLowerCase()}'
        AND block_timestamp >= toUnixTimestamp(now() - INTERVAL 30 DAY)
        AND value > 0
      GROUP BY toDate(fromUnixTimestamp(block_timestamp))
      ORDER BY payment_date DESC
      LIMIT 30;
    `;

    // Recent payments query using CDP Data API format
    const recentPaymentsQuery = `
      SELECT 
        hash as transaction_hash,
        from_address,
        fromUnixTimestamp(block_timestamp) as block_timestamp,
        toFloat64(value) / 1e18 as amount_eth
      FROM base_sepolia.transactions 
      WHERE to_address = '${wishWalletAddress.toLowerCase()}'
        AND block_timestamp >= toUnixTimestamp(now() - INTERVAL 24 HOUR)
        AND value > 0
      ORDER BY block_timestamp DESC
      LIMIT 50;
    `;

    // Top users query using CDP Data API format
    const topUsersQuery = `
      SELECT 
        from_address as wallet_address,
        COUNT(*) as query_count,
        SUM(toFloat64(value) / 1e18) as total_paid_eth
      FROM base_sepolia.transactions
      WHERE to_address = '${wishWalletAddress.toLowerCase()}'
        AND block_timestamp >= toUnixTimestamp(now() - INTERVAL 30 DAY)
        AND value > 0
      GROUP BY from_address
      ORDER BY total_paid_eth DESC
      LIMIT 20;
    `;

    // Execute queries in parallel
    const [dailyRevenueResult, recentPaymentsResult, topUsersResult] = await Promise.all([
      executeSQL(dailyRevenueQuery),
      executeSQL(recentPaymentsQuery), 
      executeSQL(topUsersQuery),
    ]);

    const analytics: PaymentAnalytics = {
      dailyRevenue: (dailyRevenueResult.data || []) as PaymentAnalytics['dailyRevenue'],
      recentPayments: (recentPaymentsResult.data || []) as PaymentAnalytics['recentPayments'],
      topUsers: (topUsersResult.data || []) as PaymentAnalytics['topUsers'],
    };

    return NextResponse.json({
      success: true,
      analytics,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch analytics data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for custom analytics queries
 */
export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json() as { query?: string };
    
    if (!query) {
      return NextResponse.json(
        { error: "SQL query is required" },
        { status: 400 }
      );
    }

    // Validate query contains our wallet address for security
    const wishWalletAddress = process.env.WISH_WALLET_ADDRESS || process.env.NEXT_PUBLIC_WISH_WALLET_ADDRESS;
    if (!wishWalletAddress || !query.includes(wishWalletAddress)) {
      return NextResponse.json(
        { error: "Query must include Wish wallet address" },
        { status: 400 }
      );
    }

    const result = await executeSQL(query);

    return NextResponse.json({
      success: true,
      data: result.data || [],
      query,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Custom query error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to execute custom query",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}