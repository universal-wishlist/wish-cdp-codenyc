
declare namespace NodeJS {
  interface ProcessEnv {
		PLASMO_PUBLIC_API_ENDPOINT?: string
		PLASMO_PUBLIC_POSTHOG_KEY?: string
		PLASMO_PUBLIC_POSTHOG_HOST?: string
		PLASMO_PUBLIC_SUPABASE_URL?: string
		PLASMO_PUBLIC_SUPABASE_KEY?: string
  }
}
