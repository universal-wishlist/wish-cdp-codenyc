"use client";

import { useState } from "react";
import { Logo } from "../components/logo";

export default function Home() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<{data: any, transactionHash?: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      console.log("API Response:", data);
      console.log("Transaction hash in response:", data.transactionHash);

      if (data.success) {
        setResponse({
          data: data.data,
          transactionHash: data.transactionHash
        });
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch (err) {
      setError("Failed to send request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto bg-blue-500">
      <div className="space-y-8">
        <div className="flex justify-center">
          <Logo className="h-32" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your query here..."
              className="w-full p-4 border border-gray-300 rounded-lg resize-none h-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="w-full bg-white text-blue-500 py-3 px-6 rounded-lg hover:bg-gray-100 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Querying..." : "Query"}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            Error: {error}
          </div>
        )}

        {response && (
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            <h3 className="font-semibold mb-2">Response:</h3>
            <pre className="whitespace-pre-wrap text-sm">
              {JSON.stringify(response.data, null, 2)}
            </pre>
            {response.transactionHash && (
              <div className="mt-3 pt-3 border-t border-green-300">
                <p className="text-sm font-medium mb-1">Transaction:</p>
                <a
                  href={`https://sepolia.basescan.org/tx/${response.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs underline hover:text-green-900"
                >
                  {response.transactionHash.slice(0, 6)}...{response.transactionHash.slice(-4)}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
