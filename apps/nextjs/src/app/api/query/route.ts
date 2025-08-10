import { NextRequest, NextResponse } from "next/server";
import { CdpClient } from "@coinbase/cdp-sdk";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";

async function getCdpAccount() {
  const cdp = new CdpClient({
    apiKeyId: process.env.CDP_API_KEY_ID!,
    apiKeySecret: process.env.CDP_API_KEY_SECRET!,
    walletSecret: process.env.CDP_WALLET_SECRET!,
  });
  return await cdp.evm.getOrCreateAccount({
    name: "retail-x402-buyer",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Query is required" },
        { status: 400 }
      );
    }

    const walletAccount = await getCdpAccount();
    const fetchWithPayment = wrapFetchWithPayment(fetch, walletAccount);

    const response = await fetchWithPayment("http://localhost:8000/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    const responseData = await response.json();

    const paymentResponse = response.headers.get("x-payment-response");
    let transactionHash = null;
    if (paymentResponse) {
      const decodedPayment = decodeXPaymentResponse(paymentResponse);
      transactionHash = decodedPayment?.transaction;
    } else {
      console.log("No payment response header found");
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      transactionHash,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
