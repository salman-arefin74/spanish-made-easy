import { useCallback, useState, type FormEvent } from "react"
import { Link, Navigate } from "react-router"
import { PageHeading } from "../../components/ui/PageHeading.tsx"
import { getSupabase, turnstileSiteKey } from "../../lib/supabase/client.ts"
import { ProfileMissing, useAuth } from "./RequireAuth.tsx"
import { TurnstileWidget } from "./TurnstileWidget.tsx"
import {
  authEmailForUsername,
  interpretSignUp,
  normalizeUsername,
  passwordError,
  usernameError,
} from "./username.ts"

const inputClass =
  "mt-2 w-full rounded-xl border border-line bg-ink px-4 py-3 text-lg text-cream"

export function SignUpPage() {
  const auth = useAuth()
  const siteKey = turnstileSiteKey()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [token, setToken] = useState<string | null>(null)
  const [widgetKey, setWidgetKey] = useState(0)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const onToken = useCallback((nextToken: string) => setToken(nextToken), [])

  if (auth.status === "loading") {
    return <p className="text-lg text-muted">Checking your account…</p>
  }
  if (auth.status === "profile-missing") return <ProfileMissing />
  if (auth.status === "ready") return <Navigate to="/" replace />
  if (auth.status === "needs-onboarding") return <Navigate to="/onboarding" replace />

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nameError = usernameError(username)
    const passError = passwordError(password)
    if (nameError || passError) {
      setFormError(nameError ?? passError)
      return
    }
    if (password !== confirmation) {
      setFormError("Those passwords do not match.")
      return
    }
    if (!token) {
      setFormError("Complete the check above before creating the account.")
      return
    }
    const supabase = getSupabase()
    if (!supabase) {
      setFormError("Add the Supabase URL and anon key to .env, then restart the dev server.")
      return
    }

    setSubmitting(true)
    setFormError(null)
    const { data, error } = await supabase.auth.signUp({
      email: authEmailForUsername(username),
      password,
      options: {
        data: { username: normalizeUsername(username) },
        captchaToken: token,
      },
    })
    const outcome = interpretSignUp({
      errorMessage: error?.message ?? null,
      identityCount: data.user?.identities?.length ?? null,
      hasSession: Boolean(data.session),
    })
    setSubmitting(false)
    if (!outcome.ok) {
      setFormError(outcome.message)
      setToken(null)
      setWidgetKey((key) => key + 1)
    }
  }

  const submitDisabled = submitting || !auth.configured || !siteKey || !token

  return (
    <>
      <PageHeading
        title="Create account"
        lede="Choose a username and a password. There is no email address."
      />
      <p className="mt-6 max-w-prose text-lg leading-relaxed text-cream">
        A forgotten password cannot be reset, and that username stays taken.
      </p>
      {!auth.configured ? (
        <p className="mt-4 max-w-prose text-lg text-danger" role="alert">
          Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart
          the dev server. The README section “Create the Supabase project” says
          which key to copy. Use the publishable or anon key, never a secret or
          service-role key.
        </p>
      ) : null}
      {!siteKey ? (
        <p className="mt-4 max-w-prose text-lg text-cream" role="status">
          Create account also needs VITE_TURNSTILE_SITE_KEY. The Turnstile secret
          stays in the Supabase dashboard.
        </p>
      ) : null}
      <form className="mt-8 max-w-md space-y-5" onSubmit={(event) => void onSubmit(event)}>
        <label className="block text-lg" htmlFor="username">
          Username
          <input
            id="username"
            className={inputClass}
            autoCapitalize="none"
            autoComplete="username"
            spellCheck={false}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label className="block text-lg" htmlFor="password">
          Password
          <input
            id="password"
            type="password"
            className={inputClass}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="block text-lg" htmlFor="confirmation">
          Confirm password
          <input
            id="confirmation"
            type="password"
            className={inputClass}
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>
        {siteKey ? <TurnstileWidget key={widgetKey} siteKey={siteKey} onToken={onToken} /> : null}
        {formError ? (
          <p className="text-lg text-danger" role="alert">
            {formError}
          </p>
        ) : null}
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-copper px-5 py-3 font-semibold text-copper-ink disabled:opacity-50"
          disabled={submitDisabled}
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-lg text-muted">
        Already registered?{" "}
        <Link className="text-cream underline decoration-copper underline-offset-4" to="/sign-in">
          Sign in
        </Link>
        . Read the{" "}
        <Link className="text-cream underline decoration-copper underline-offset-4" to="/privacy">
          privacy page
        </Link>
        .
      </p>
    </>
  )
}
