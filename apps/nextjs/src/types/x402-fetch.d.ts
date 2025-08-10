/**
 * Type declarations for x402-fetch package
 */

declare module 'x402-fetch' {
  export interface PaymentResponse {
    transaction?: string;
    [key: string]: unknown;
  }

  export function wrapFetchWithPayment(
    fetchFunction: typeof fetch,
    account: unknown
  ): typeof fetch;

  export function decodeXPaymentResponse(
    paymentResponse: string
  ): PaymentResponse | null;
}