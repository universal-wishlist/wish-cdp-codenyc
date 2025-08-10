/**
 * Test route for CDP Data SQL API connectivity
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  try {
    // Simple test query to verify API access
    const testQuery = `
      SELECT 
        COUNT(*) as total_transactions
      FROM base_sepolia.transactions
      WHERE value > 0
      LIMIT 1;
    `;

    console.log("Testing CDP Data API connectivity...");
    console.log("API Key ID:", process.env.CDP_API_KEY_ID ? "Present" : "Missing");
    console.log("API Key Secret:", process.env.CDP_API_KEY_SECRET ? "Present" : "Missing");

    const response = await fetch("https://api.cdp.coinbase.com/platform/v2/data/query/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.CDP_API_KEY_SECRET}`,
      },
      body: JSON.stringify({ sql: testQuery }),
    });

    console.log("CDP API Response Status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("CDP API Error Body:", errorText);
      return NextResponse.json({
        success: false,
        error: `CDP API Error: ${response.status} ${response.statusText}`,
        details: errorText,
      });
    }

    const data: unknown = await response.json();
    console.log("CDP API Response Data:", data);

    return NextResponse.json({
      success: true,
      message: "CDP Data API connectivity test successful",
      data: data,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Test API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to test CDP Data API",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}