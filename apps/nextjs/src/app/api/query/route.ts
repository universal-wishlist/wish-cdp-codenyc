import { NextRequest, NextResponse } from "next/server";
import { CdpClient } from "@coinbase/cdp-sdk";
import { toAccount } from "viem/accounts";
import {
  wrapFetchWithPayment,
  decodeXPaymentResponse,
} from "x402-fetch/dist/cjs/index.js";

const cdp = new CdpClient();
const cdpAccount = await cdp.evm.createAccount();
const account = toAccount(cdpAccount);

export async function POST(req: NextRequest) {
  try {
    const fetchWithPayment = wrapFetchWithPayment(fetch, account);
    fetchWithPayment("http://localhost:8000/query", {
      method: "POST",
      body: JSON.stringify({
        query: "What is the weather in Tokyo?",
      }),
    })
      .then(async (response) => {
        const body = await response.json();
        console.log(body);

        const paymentResponse = decodeXPaymentResponse(
          response.headers.get("x-payment-response")!
        );
        console.log(paymentResponse);
      })
      .catch((error) => {
        console.error(error.response?.data?.error);
      });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}
