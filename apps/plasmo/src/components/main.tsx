"use client";

import { LoginForm } from "@/components/login-form";
import { Wishlist } from "@/components/wishlist";
import type { User } from "@supabase/supabase-js";

import { Storage } from "@plasmohq/storage";
import { useStorage } from "@plasmohq/storage/hook";
import { useCurrentUser } from "@coinbase/cdp-hooks";

export function Main() {
  const { currentUser } = useCurrentUser();
  const [user, setUser] = useStorage<User>({
    key: "user",
    instance: new Storage({
      area: "local",
    }),
  });

  return (
    <div className="flex h-[25rem] w-[25rem] flex-col">
      {user && currentUser ? (
        <Wishlist user={user} onLogout={() => setUser(null)} />
      ) : (
        <LoginForm />
      )}
    </div>
  );
}
