/**
 * Admin dashboard page for Wish platform analytics.
 * 
 * Displays real-time payment data, revenue tracking, and user analytics
 * using Coinbase CDP Data SQL API integration.
 */

"use client";

import { AnalyticsDashboard } from "../../components/analytics-dashboard";
import { Logo } from "../../components/logo";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Logo className="h-12" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Wish Analytics</h1>
                <p className="text-gray-600">Real-time payment insights powered by CDP Data</p>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              <p>Connected to Base Sepolia</p>
              <p>Last updated: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </header>

        {/* Analytics Dashboard */}
        <main>
          <AnalyticsDashboard />
        </main>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>Powered by Coinbase Developer Platform (CDP) Data SQL API</p>
          <div className="flex justify-center space-x-4 mt-2">
            <a href="/api/analytics" className="text-blue-500 hover:underline">
              View Raw API Data
            </a>
            <span>•</span>
            <a href="/" className="text-blue-500 hover:underline">
              Back to Query Interface
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}