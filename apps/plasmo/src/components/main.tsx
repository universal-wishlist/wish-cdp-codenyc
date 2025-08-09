"use client"

import { LoginForm } from "@/components/login-form"
import { Wishlist } from "@/components/wishlist"
import type { User } from "@supabase/supabase-js"
import posthog from "posthog-js"
import { useEffect } from "react"

import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

export function Main() {
  const [user, setUser] = useStorage<User>({
    key: "user",
    instance: new Storage({
      area: "local"
    })
  })

  useEffect(() => {
    posthog.init(process.env.PLASMO_PUBLIC_POSTHOG_KEY as string, {
      api_host:
        process.env.PLASMO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      person_profiles: "identified_only",
      defaults: "2025-05-24"
    })
  }, [])

  return (
    <div className="flex h-[25rem] w-[25rem] flex-col">
      {user ? (
        <Wishlist user={user} onLogout={() => setUser(null)} />
      ) : (
        <LoginForm />
      )}
    </div>
  )
}
