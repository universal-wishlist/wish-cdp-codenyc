import { supabase } from "@/core/supabase"

export async function signInWithChromeIdentity(): Promise<{
  user: any
  error?: any
}> {
  try {
    const manifest = chrome.runtime.getManifest() as any

    if (!manifest.oauth2?.client_id) {
      throw new Error("Google OAuth client ID not configured in manifest")
    }

    const url = new URL("https://accounts.google.com/o/oauth2/auth")
    url.searchParams.set("client_id", manifest.oauth2.client_id)
    url.searchParams.set("response_type", "id_token")
    url.searchParams.set("access_type", "offline")
    url.searchParams.set(
      "redirect_uri",
      `https://${chrome.runtime.id}.chromiumapp.org`
    )
    url.searchParams.set("scope", manifest.oauth2.scopes.join(" "))

    return new Promise((resolve) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: url.href,
          interactive: true
        },
        async (redirectedTo) => {
          if (chrome.runtime.lastError) {
            resolve({
              user: null,
              error: new Error(chrome.runtime.lastError.message)
            })
          } else if (!redirectedTo) {
            resolve({
              user: null,
              error: new Error("No redirect URL returned")
            })
          } else {
            try {
              // Extract the ID token from the redirected URL
              const url = new URL(redirectedTo)
              const params = new URLSearchParams(url.hash.substring(1)) // Remove the # and parse
              const idToken = params.get("id_token")

              if (!idToken) {
                resolve({
                  user: null,
                  error: new Error("No ID token found in response")
                })
                return
              }

              // Sign in with Supabase using the ID token
              const { data, error } = await supabase.auth.signInWithIdToken({
                provider: "google",
                token: idToken
              })

              if (error) {
                resolve({ user: null, error })
              } else {
                resolve({ user: data.user, error: null })
              }
            } catch (parseError) {
              resolve({
                user: null,
                error: parseError
              })
            }
          }
        }
      )
    })
  } catch (error) {
    return { user: null, error }
  }
}
