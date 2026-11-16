import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { Navigate } from "react-router"
import { EmptyState } from "../../components/ui/EmptyState.tsx"
import { PageHeading } from "../../components/ui/PageHeading.tsx"
import { getSupabase } from "../../lib/supabase/client.ts"
import { isProfileComplete, type Profile } from "./username.ts"

export type AuthStatus =
  | "loading"
  | "signed-out"
  | "needs-onboarding"
  | "ready"
  | "profile-missing"

export type AuthState = {
  status: AuthStatus
  configured: boolean
  userId: string | null
  profile: Profile | null
}

type AuthContextValue = AuthState & {
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const signedOut = (configured: boolean): AuthState => ({
  status: "signed-out",
  configured,
  userId: null,
  profile: null,
})

const AuthContext = createContext<AuthContextValue | null>(null)

async function loadAccount(userId: string): Promise<AuthState> {
  const supabase = getSupabase()
  if (!supabase) return signedOut(false)

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, proficiency_level, daily_learning_target")
    .eq("id", userId)
    .maybeSingle()

  if (error || !data) {
    return { status: "profile-missing", configured: true, userId, profile: null }
  }

  const profile = data as Profile
  return {
    status: isProfileComplete(profile) ? "ready" : "needs-onboarding",
    configured: true,
    userId,
    profile,
  }
}

export function AuthProvider({
  children,
  initialAuth,
}: {
  children: ReactNode
  initialAuth?: AuthState
}) {
  const [state, setState] = useState<AuthState>(
    initialAuth ?? { status: "loading", configured: false, userId: null, profile: null },
  )

  async function refresh() {
    const supabase = getSupabase()
    if (!supabase) {
      setState(signedOut(false))
      return
    }
    const { data } = await supabase.auth.getSession()
    const userId = data.session?.user.id
    if (!userId) {
      setState(signedOut(true))
      return
    }
    setState(await loadAccount(userId))
  }

  async function signOut() {
    const supabase = getSupabase()
    if (supabase) await supabase.auth.signOut()
    setState(signedOut(supabase !== null))
  }

  useEffect(() => {
    if (initialAuth) return
    const supabase = getSupabase()
    if (!supabase) {
      setState(signedOut(false))
      return
    }

    let active = true
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null
      window.setTimeout(() => {
        if (!active) return
        if (!userId) {
          setState(signedOut(true))
          return
        }
        void loadAccount(userId).then((next) => {
          if (active) setState(next)
        })
      }, 0)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [initialAuth])

  return (
    <AuthContext.Provider value={{ ...state, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function ProfileMissing() {
  return (
    <>
      <PageHeading
        title="Account incomplete"
        lede="The login worked. There is no profile row yet, so setup cannot continue."
      />
      <EmptyState>
        In the Supabase SQL editor, run supabase/migrations/0001_profiles.sql.
        That creates the profiles table and copies usernames that already exist.
        Then sign out and sign in again.
      </EmptyState>
    </>
  )
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used inside AuthProvider.")
  return value
}

export function RequireAuth({
  allow,
  children,
}: {
  allow: "ready" | "onboarding"
  children: ReactNode
}) {
  const auth = useAuth()

  if (auth.status === "loading") {
    return <p className="text-lg text-muted">Checking your account…</p>
  }

  if (auth.status === "signed-out") {
    return <Navigate to="/sign-in" replace />
  }

  if (auth.status === "profile-missing") {
    return <ProfileMissing />
  }

  if (auth.status === "needs-onboarding" && allow === "ready") {
    return <Navigate to="/onboarding" replace />
  }

  if (auth.status === "ready" && allow === "onboarding") {
    return <Navigate to="/" replace />
  }

  return children
}
