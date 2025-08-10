"use client";

/**
 * Main application page component.
 * 
 * Provides a simple query interface for testing the x402 payment-enabled
 * product insights API. Users can submit queries and view responses with
 * associated transaction information.
 */

import { useState, FormEvent } from "react";
import { Logo } from "../components/logo";

// Types for component state
interface QueryResponse {
  data: any;
  transactionHash?: string;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  transactionHash?: string;
  error?: string;
}

export default function Home() {
  // Component state
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle form submission for query processing.
   * 
   * @param e - Form submission event
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate input
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError("Please enter a query");
      return;
    }

    if (trimmedQuery.length > 1000) {
      setError("Query must be less than 1000 characters");
      return;
    }

    // Reset state for new request
    setLoading(true);
    setError(null);
    setResponse(null);

    console.log(`Submitting query: ${trimmedQuery.substring(0, 50)}...`);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: trimmedQuery }),
      });

      let data: ApiResponse;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error("Failed to parse API response:", parseError);
        setError("Invalid response from server");
        return;
      }

      console.log("API Response:", data);
      
      if (data.transactionHash) {
        console.log("Transaction hash:", data.transactionHash);
      }

      if (data.success) {
        setResponse({
          data: data.data,
          transactionHash: data.transactionHash
        });
        console.log("Query processed successfully");
      } else {
        const errorMessage = data.error || "Something went wrong";
        console.error("API returned error:", errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      console.error("Request failed:", err);
      setError("Failed to send request. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto bg-blue-500">
      <div className="space-y-8">
        {/* Header with logo */}
        <header className="flex justify-center">
          <Logo className="h-32" />
        </header>

        <main className="space-y-6">
          {/* Query form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="query" className="block text-sm font-medium text-white mb-2">
                Product Query ({query.length}/1000 characters)
              </label>
              <textarea
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your product query here... (e.g., 'Best wireless headphones under $200')"
                className="w-full p-4 border border-gray-300 rounded-lg resize-none h-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-500"
                disabled={loading}
                maxLength={1000}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !query.trim() || query.length > 1000}
              className="w-full bg-white text-blue-500 py-3 px-6 rounded-lg hover:bg-gray-100 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              aria-label={loading ? "Processing query" : "Submit query"}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                "Submit Query"
              )}
            </button>
          </form>

          {/* Error display */}
          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg" role="alert">
              <h3 className="font-semibold mb-1">Error</h3>
              <p>{error}</p>
            </div>
          )}

          {/* Response display */}
          {response && (
            <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              <h3 className="font-semibold mb-3">Wishlist Insights</h3>
              
              {/* Formatted response display */}
              <div className="space-y-3">
                {response.data?.wishlistInsights && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Total Wishlist Adds:</span>
                        <p>{response.data.wishlistInsights.totalWishlistAdds?.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="font-medium">Avg. Days on Wishlist:</span>
                        <p>{response.data.wishlistInsights.averageDaysOnWishlist}</p>
                      </div>
                      <div>
                        <span className="font-medium">Conversion Rate:</span>
                        <p>{response.data.wishlistInsights.conversionFromWishlist}%</p>
                      </div>
                    </div>
                    
                    {/* Detailed JSON for developers */}
                    <details className="mt-4">
                      <summary className="cursor-pointer font-medium text-sm">View Raw Response</summary>
                      <pre className="mt-2 text-xs overflow-auto max-h-64 bg-white p-3 rounded border">
                        {JSON.stringify(response.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
              
              {/* Transaction information */}
              {response.transactionHash && (
                <div className="mt-4 pt-3 border-t border-green-300">
                  <p className="text-sm font-medium mb-2">Payment Transaction:</p>
                  <a
                    href={`https://sepolia.basescan.org/tx/${response.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs underline hover:text-green-900 break-all"
                    aria-label="View transaction on Basescan"
                  >
                    {response.transactionHash.slice(0, 10)}...{response.transactionHash.slice(-10)}
                  </a>
                  <p className="text-xs text-green-600 mt-1">Payment processed on Base Sepolia testnet</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
