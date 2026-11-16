import { useState, type FormEvent } from "react"
import { PageHeading } from "../../components/ui/PageHeading.tsx"
import { getSupabase } from "../../lib/supabase/client.ts"
import { RequireAuth, useAuth } from "./RequireAuth.tsx"
import { StudyPreferences } from "./StudyPreferences.tsx"
import { passwordError, targetError, type OnboardingLevel } from "./username.ts"

const inputClass =
  "mt-2 w-full rounded-xl border border-line bg-ink px-4 py-3 text-lg text-cream"

function parseWholeTarget(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null
  return Number(value.trim())
}

export function SettingsPage() {
  return (
    <RequireAuth allow="ready">
      <SettingsForm />
    </RequireAuth>
  )
}

function SettingsForm() {
  const auth = useAuth()
  const storedLevel = auth.profile?.proficiency_level
  const [level, setLevel] = useState<OnboardingLevel | null>(
    storedLevel === "A1" || storedLevel === "A2" ? storedLevel : null,
  )
  const [targetText, setTargetText] = useState(
    String(auth.profile?.daily_learning_target ?? 10),
  )
  const [preferenceError, setPreferenceError] = useState<string | null>(null)
  const [preferenceSaved, setPreferenceSaved] = useState(false)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!level) {
      setPreferenceError("Choose a starting point.")
      setPreferenceSaved(false)
      return
    }
    const target = parseWholeTarget(targetText)
    if (target === null || targetError(target)) {
      setPreferenceError("Choose a whole number from 5 to 50.")
      setPreferenceSaved(false)
      return
    }
    const supabase = getSupabase()
    if (!supabase || !auth.userId) return

    setSavingPreferences(true)
    setPreferenceError(null)
    setPreferenceSaved(false)
    const { error } = await supabase
      .from("profiles")
      .update({
        proficiency_level: level,
        daily_learning_target: target,
      })
      .eq("id", auth.userId)
    setSavingPreferences(false)
    if (error) {
      setPreferenceError(error.message)
      return
    }
    setPreferenceSaved(true)
    await auth.refresh()
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = passwordError(password)
    if (problem) {
      setPasswordMessage(problem)
      setPasswordSaved(false)
      return
    }
    if (password !== confirmation) {
      setPasswordMessage("Those passwords do not match.")
      setPasswordSaved(false)
      return
    }
    const supabase = getSupabase()
    if (!supabase) return

    setSavingPassword(true)
    setPasswordMessage(null)
    setPasswordSaved(false)
    const { error } = await supabase.auth.updateUser({ password })
    setSavingPassword(false)
    if (error) {
      setPasswordMessage(error.message)
      return
    }
    setPassword("")
    setConfirmation("")
    setPasswordSaved(true)
  }

  return (
    <>
      <PageHeading
        title="Settings"
        lede={`Signed in as ${auth.profile?.username ?? "your account"}.`}
      />
      <form className="max-w-xl" onSubmit={(event) => void savePreferences(event)}>
        <StudyPreferences
          level={level}
          targetText={targetText}
          onLevel={setLevel}
          onTargetText={setTargetText}
        />
        {preferenceError ? (
          <p className="mt-4 text-lg text-danger" role="alert">
            {preferenceError}
          </p>
        ) : null}
        {preferenceSaved ? (
          <p className="mt-4 text-lg text-cream" role="status">
            Starting point and daily target saved.
          </p>
        ) : null}
        <button
          type="submit"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-copper px-5 py-3 font-semibold text-copper-ink disabled:opacity-50"
          disabled={savingPreferences}
        >
          {savingPreferences ? "Saving…" : "Save preferences"}
        </button>
      </form>
      <form className="mt-12 max-w-md space-y-5" onSubmit={(event) => void changePassword(event)}>
        <h2 className="text-2xl font-semibold">Change password</h2>
        <p className="text-lg text-muted">
          This works only while you are signed in. A forgotten password cannot be reset.
        </p>
        <label className="block text-lg" htmlFor="new-password">
          New password
          <input
            id="new-password"
            type="password"
            className={inputClass}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="block text-lg" htmlFor="confirm-password">
          Confirm new password
          <input
            id="confirm-password"
            type="password"
            className={inputClass}
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>
        {passwordMessage ? (
          <p className="text-lg text-danger" role="alert">
            {passwordMessage}
          </p>
        ) : null}
        {passwordSaved ? (
          <p className="text-lg text-cream" role="status">
            Password changed.
          </p>
        ) : null}
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-copper px-5 py-3 font-semibold text-copper-ink disabled:opacity-50"
          disabled={savingPassword}
        >
          {savingPassword ? "Changing…" : "Change password"}
        </button>
      </form>
    </>
  )
}
