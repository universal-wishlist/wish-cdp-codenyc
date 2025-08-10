/**
 * Query API route for processing product queries with x402 payment.
 * 
 * This endpoint serves as a payment proxy between the frontend and FastAPI backend,
 * handling CDP wallet management and x402 payment protocol integration.
 */

import { NextRequest, NextResponse } from "next/server";
import { CdpClient } from "@coinbase/cdp-sdk";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";

// Types for request/response
interface QueryRequest {
  query: string;
}

interface QueryResponse {
  success: boolean;
  data?: any;
  transactionHash?: string;
  error?: string;
}

/**
 * Get or create CDP wallet account for payment processing.
 * 
 * @returns Promise<Account> - CDP wallet account
 * @throws Error if CDP configuration is invalid
 */
async function getCdpAccount() {
  try {
    // Validate required environment variables
    const requiredEnvVars = {
      CDP_API_KEY_ID: process.env.CDP_API_KEY_ID,
      CDP_API_KEY_SECRET: process.env.CDP_API_KEY_SECRET,
      CDP_WALLET_SECRET: process.env.CDP_WALLET_SECRET,
    };

    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }

    const cdp = new CdpClient({
      apiKeyId: requiredEnvVars.CDP_API_KEY_ID!,
      apiKeySecret: requiredEnvVars.CDP_API_KEY_SECRET!,
      walletSecret: requiredEnvVars.CDP_WALLET_SECRET!,
    });

    const account = await cdp.evm.getOrCreateAccount({
      name: "retail-x402-buyer",
    });

    console.log(`CDP account initialized: ${account.id}`);
    return account;
  } catch (error) {
    console.error("Failed to initialize CDP account:", error);
    throw error;
  }
}

/**
 * POST handler for product queries.
 * 
 * Processes product queries by forwarding them to the FastAPI backend
 * with x402 payment integration using CDP wallet.
 * 
 * @param req - Next.js request object
 * @returns Promise<NextResponse> - JSON response with query results
 */
export async function POST(req: NextRequest): Promise<NextResponse<QueryResponse>> {
  const startTime = Date.now();
  console.log("[Query API] Processing new query request");

  try {
    // Parse and validate request body
    let body: QueryRequest;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("[Query API] Failed to parse request body:", parseError);
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { query } = body;

    // Validate required fields
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      console.warn("[Query API] Missing or invalid query parameter");
      return NextResponse.json(
        { success: false, error: "Query is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Validate query length
    if (query.length > 1000) {
      console.warn("[Query API] Query too long:", query.length);
      return NextResponse.json(
        { success: false, error: "Query must be less than 1000 characters" },
        { status: 400 }
      );
    }

    console.log(`[Query API] Processing query: ${query.substring(0, 50)}...`);

    // Initialize CDP wallet account
    let walletAccount;
    try {
      walletAccount = await getCdpAccount();
    } catch (cdpError) {
      console.error("[Query API] CDP account initialization failed:", cdpError);
      return NextResponse.json(
        { success: false, error: "Payment system unavailable" },
        { status: 503 }
      );
    }

    // Setup payment-wrapped fetch
    const fetchWithPayment = wrapFetchWithPayment(fetch, walletAccount);

    // Make request to FastAPI backend
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const apiUrl = `${backendUrl}/query`;
    
    console.log(`[Query API] Calling backend at: ${apiUrl}`);
    
    let response;
    try {
      response = await fetchWithPayment(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: query.trim() }),
      });
    } catch (fetchError) {
      console.error("[Query API] Backend request failed:", fetchError);
      return NextResponse.json(
        { success: false, error: "Failed to connect to backend service" },
        { status: 502 }
      );
    }

    // Parse backend response
    let responseData;
    try {
      responseData = await response.json();
    } catch (parseError) {
      console.error("[Query API] Failed to parse backend response:", parseError);
      return NextResponse.json(
        { success: false, error: "Invalid response from backend service" },
        { status: 502 }
      );
    }

    // Check if backend returned an error
    if (!response.ok) {
      console.error(`[Query API] Backend returned error: ${response.status}`, responseData);
      return NextResponse.json(
        { 
          success: false, 
          error: responseData?.detail || "Backend service error" 
        },
        { status: response.status }
      );
    }

    // Extract payment transaction hash if available
    const paymentResponse = response.headers.get("x-payment-response");
    let transactionHash: string | undefined;
    
    if (paymentResponse) {
      try {
        const decodedPayment = decodeXPaymentResponse(paymentResponse);
        transactionHash = decodedPayment?.transaction;
        console.log(`[Query API] Payment processed: ${transactionHash}`);
      } catch (paymentError) {
        console.warn("[Query API] Failed to decode payment response:", paymentError);
      }
    } else {
      console.log("[Query API] No payment response header found");
    }

    const processingTime = Date.now() - startTime;
    console.log(`[Query API] Query processed successfully in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      data: responseData,
      transactionHash,
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[Query API] Unexpected error after ${processingTime}ms:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: process.env.NODE_ENV === 'development' 
          ? `Internal server error: ${error}` 
          : "Internal server error" 
      },
      { status: 500 }
    );
  }
}
