/**
 * Analytics Dashboard Component
 * Displays real-time payment and revenue data from CDP Data SQL API
 */

"use client";

import { useState, useEffect, useCallback } from "react";

interface AnalyticsData {
  dailyRevenue: Array<{
    payment_date: string;
    transactions_count: number;
    daily_revenue_eth: number;
    unique_users: number;
  }>;
  recentPayments: Array<{
    transaction_hash: string;
    from_address: string;
    block_timestamp: string;
    amount_eth: number;
  }>;
  topUsers: Array<{
    wallet_address: string;
    query_count: number;
    total_paid_eth: number;
  }>;
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoData, setIsDemoData] = useState(false);

  // Helper function to safely get date string
  const getDateString = useCallback((date: Date): string => {
    return date.toISOString().split('T')[0] || date.toDateString();
  }, []);

  // Demo data for when API is not configured
  const getDemoAnalytics = useCallback((): AnalyticsData => ({
    dailyRevenue: [
      {
        payment_date: getDateString(new Date()),
        transactions_count: 15,
        daily_revenue_eth: 0.015,
        unique_users: 8
      },
      {
        payment_date: getDateString(new Date(Date.now() - 86400000)),
        transactions_count: 22,
        daily_revenue_eth: 0.022,
        unique_users: 12
      },
      {
        payment_date: getDateString(new Date(Date.now() - 172800000)),
        transactions_count: 18,
        daily_revenue_eth: 0.018,
        unique_users: 9
      }
    ],
    recentPayments: [
      {
        transaction_hash: '0x826f1ce5d3606307e766dfaa72ad8e7bbbfe909f4b4b44ffb2d02e4ac39574e7',
        from_address: '0x48E2c7CfDEE2d783A811Ae6B0eB700250e8c1360',
        block_timestamp: new Date().toISOString(),
        amount_eth: 0.001
      },
      {
        transaction_hash: '0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        from_address: '0xabcdef0123456789abcdef0123456789abcdef01',
        block_timestamp: new Date(Date.now() - 3600000).toISOString(),
        amount_eth: 0.001
      }
    ],
    topUsers: [
      {
        wallet_address: '0x48E2c7CfDEE2d783A811Ae6B0eB700250e8c1360',
        query_count: 25,
        total_paid_eth: 0.025
      },
      {
        wallet_address: '0xabcdef0123456789abcdef0123456789abcdef01',
        query_count: 18,
        total_paid_eth: 0.018
      }
    ]
  }), [getDateString]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/analytics');
      const data = await response.json() as { success?: boolean; analytics?: AnalyticsData };
      
      if (data.success) {
        setAnalytics(data.analytics || null);
        setIsDemoData(false);
      } else {
        // Show demo data when API is not configured
        console.log('Analytics API not configured, showing demo data');
        setAnalytics(getDemoAnalytics());
        setIsDemoData(true);
      }
    } catch {
      // Show demo data on network error
      console.log('Network error, showing demo data');
      setAnalytics(getDemoAnalytics());
      setIsDemoData(true);
    } finally {
      setLoading(false);
    }
  }, [getDemoAnalytics]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-700">
          <h3 className="font-semibold">Error loading analytics</h3>
          <p className="text-sm mt-1">{error}</p>
          <button 
            onClick={() => void fetchAnalytics()}
            className="mt-2 text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const totalRevenue = analytics.dailyRevenue.reduce(
    (sum, day) => sum + day.daily_revenue_eth, 0
  );

  const totalTransactions = analytics.dailyRevenue.reduce(
    (sum, day) => sum + day.transactions_count, 0
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Analytics</h2>
          {isDemoData && (
            <p className="text-sm text-amber-600 mt-1">
              ⚠️ Showing demo data - CDP Data API not configured
            </p>
          )}
        </div>
        <button 
          onClick={() => void fetchAnalytics()}
          className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-sm font-medium text-gray-500">Total Revenue (30d)</h3>
          <p className="text-2xl font-bold text-green-600">
            {totalRevenue.toFixed(6)} ETH
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-sm font-medium text-gray-500">Total Queries</h3>
          <p className="text-2xl font-bold text-blue-600">
            {totalTransactions.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-sm font-medium text-gray-500">Top User Queries</h3>
          <p className="text-2xl font-bold text-purple-600">
            {analytics.topUsers[0]?.query_count || 0}
          </p>
        </div>
      </div>

      {/* Daily Revenue Chart */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Daily Revenue Trend</h3>
        <div className="space-y-2">
          {analytics.dailyRevenue.slice(0, 7).map((day) => (
            <div key={day.payment_date} className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {new Date(day.payment_date).toLocaleDateString()}
              </span>
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium">
                  {day.transactions_count} queries
                </span>
                <span className="text-sm font-bold text-green-600">
                  {day.daily_revenue_eth.toFixed(6)} ETH
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Recent Payments</h3>
        <div className="space-y-3">
          {analytics.recentPayments.slice(0, 5).map((payment) => (
            <div key={payment.transaction_hash} className="flex justify-between items-center py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-mono text-gray-600">
                  {payment.from_address.slice(0, 6)}...{payment.from_address.slice(-4)}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(payment.block_timestamp).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-600">
                  {payment.amount_eth.toFixed(6)} ETH
                </p>
                <a 
                  href={`https://sepolia.basescan.org/tx/${payment.transaction_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline"
                >
                  View →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Users */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Top Users</h3>
        <div className="space-y-3">
          {analytics.topUsers.slice(0, 5).map((user, index) => (
            <div key={user.wallet_address} className="flex justify-between items-center py-2">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                <span className="text-sm font-mono text-gray-600">
                  {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{user.query_count} queries</p>
                <p className="text-xs text-green-600">
                  {user.total_paid_eth.toFixed(6)} ETH
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}