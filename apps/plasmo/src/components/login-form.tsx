import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signInWithChromeIdentity } from "@/core/chrome"
import { supabase } from "@/core/supabase"
import { cn } from "@/lib/utils"
import type { User } from "@supabase/supabase-js"
import { useEffect, useState } from "react"

import { useSignInWithEmail, useVerifyEmailOTP } from "@coinbase/cdp-hooks";

import { sendToBackground } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [user, setUser] = useStorage<User>({
    key: "user",
    instance: new Storage({
      area: "local"
    })
  })

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<"LOGIN" | "SIGNUP">("LOGIN")
  
  const { signInWithEmail } = useSignInWithEmail()
  const { verifyEmailOTP } = useVerifyEmailOTP()
  const [cdpFlowId, setCdpFlowId] = useState<string | null>(null)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [otp, setOtp] = useState("")

  useEffect(() => {
    async function init() {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        return
      }
      if (!!data.session) {
        setUser(data.session.user)
        sendToBackground({
          name: "init-session",
          body: {
            refresh_token: data.session.refresh_token,
            access_token: data.session.access_token
          }
        })
      }
    }

    init()
  }, [])

  const handleEmailLogin = async (
    type: "LOGIN" | "SIGNUP",
    username: string,
    password: string
  ) => {
    setLoading(true)
    try {
      const {
        error,
        data: { user }
      } =
        type === "LOGIN"
          ? await supabase.auth.signInWithPassword({
              email: username,
              password
            })
          : await supabase.auth.signUp({ email: username, password })

      if (error) {
        alert("Error with auth: " + error.message)
      } else if (!user && type === "SIGNUP") {
        alert("Signup successful, confirmation mail should be sent soon!")
      } else if (user) {
        setUser(user)
      }
    } catch (error: any) {
      alert(error.error_description || error.message || error)
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthLogin = async () => {
    setLoading(true)
    try {
      const { user, error } = await signInWithChromeIdentity()

      if (error) {
        throw error
      }

      if (user) {
        setUser(user)

        const { data } = await supabase.auth.getSession()
        if (data.session) {
          sendToBackground({
            name: "init-session",
            body: {
              refresh_token: data.session.refresh_token,
              access_token: data.session.access_token
            }
          })
        }
      }
    } catch (error) {
      alert("OAuth error: " + (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  const handleCdpSignIn = async () => {
    if (!email) {
      alert("Please enter an email address")
      return
    }

    setLoading(true)
    try {
      const { flowId } = await signInWithEmail({ email })
      setCdpFlowId(flowId)
      setShowOtpInput(true)
    } catch (error) {
      alert("CDP sign-in error: " + (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!cdpFlowId || !otp) {
      alert("Please enter the OTP code")
      return
    }

    setLoading(true)
    try {
      const { user } = await verifyEmailOTP({
        flowId: cdpFlowId,
        otp
      })
      
      if (user) {
        alert("CDP authentication successful!")
        setShowOtpInput(false)
        setCdpFlowId(null)
        setOtp("")
      }
    } catch (error) {
      alert("OTP verification error: " + (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleEmailLogin(mode, email, password)
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-6 border-b pb-4">
          <div className="mb-1 text-2xl font-semibold text-blue-500">
            {mode === "LOGIN" ? "Login" : "Sign up"}
          </div>
          <div className="text-sm text-gray-500">
            {mode === "LOGIN"
              ? "Enter your email below to login to your account"
              : "Create a new account with your email"}
          </div>
        </div>
        <div>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm text-blue-500 underline-offset-4 hover:text-blue-600 hover:underline"
                    tabIndex={-1}>
                    Forgot your password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={
                    mode === "LOGIN" ? "current-password" : "new-password"
                  }
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? mode === "LOGIN"
                    ? "Logging in..."
                    : "Signing up..."
                  : mode === "LOGIN"
                    ? "Login"
                    : "Sign up"}
              </Button>
              {/* <Button
                type="button"
                onClick={handleOAuthLogin}
                variant="outline"
                className="w-full"
                disabled={loading}>
                Login with Google
              </Button> */}
              
              {/* CDP Authentication Section */}
              <div className="border-t pt-4 mt-4">
                {!showOtpInput ? (
                  <Button
                    type="button"
                    onClick={handleCdpSignIn}
                    variant="outline"
                    className="w-full"
                    disabled={loading || !email}>
                    Sign in with Coinbase
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      <Label htmlFor="otp">Enter OTP Code</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        autoComplete="one-time-code"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleVerifyOtp}
                        className="flex-1"
                        disabled={loading || !otp}>
                        {loading ? "Verifying..." : "Verify OTP"}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setShowOtpInput(false)
                          setCdpFlowId(null)
                          setOtp("")
                        }}
                        variant="outline"
                        disabled={loading}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              {mode === "LOGIN" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    className="text-blue-500 underline underline-offset-4 hover:text-blue-600"
                    onClick={() => setMode("SIGNUP")}>
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-blue-500 underline underline-offset-4 hover:text-blue-600"
                    onClick={() => setMode("LOGIN")}>
                    Login
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
