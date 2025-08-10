"use client";

/**
 * Main component for the browser extension popup.
 * 
 * Manages authentication state and renders either the login form
 * or the main wishlist interface based on user authentication status.
 */

import React from 'react';
import { LoginForm } from "@/components/login-form";
import { Wishlist } from "@/components/wishlist";
import type { User } from "@supabase/supabase-js";

import { Storage } from "@plasmohq/storage";
import { useStorage } from "@plasmohq/storage/hook";
import { useCurrentUser } from "@coinbase/cdp-hooks";

/**
 * Main component that handles authentication state and routing.
 * 
 * @returns JSX.Element - Either LoginForm or Wishlist component
 */
export function Main(): JSX.Element {
  // Get current CDP wallet user
  const { currentUser } = useCurrentUser();
  
  // Get/set Supabase user from local storage
  const [user, setUser] = useStorage<User>({
    key: "user",
    instance: new Storage({
      area: "local",
    }),
  });

  /**
   * Handle user logout by clearing stored user data.
   */
  const handleLogout = React.useCallback(() => {
    console.log('Logging out user');
    setUser(null);
  }, [setUser]);

  // Show loading state while checking authentication
  if (user === undefined || currentUser === undefined) {
    return (
      <div className="flex h-[25rem] w-[25rem] flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-sm text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[25rem] w-[25rem] flex-col bg-white">
      {user && currentUser ? (
        <Wishlist 
          user={user} 
          onLogout={handleLogout} 
        />
      ) : (
        <LoginForm />
      )}
    </div>
  );
}
