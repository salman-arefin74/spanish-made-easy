import { useState, type FormEvent } from "react"
import { PageHeading } from "../../components/ui/PageHeading.tsx"
import { getSupabase } from "../../lib/supabase/client.ts"
import { RequireAuth, useAuth } from "./RequireAuth.tsx"
import { StudyPreferences } from "./StudyPreferences.tsx"
import { targetError, type OnboardingLevel } from "./username.ts"

function parseWholeTarget(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null
  return Number(value.trim())
}

export function OnboardingPage() {
  return (
    <RequireAuth allow="onboarding">
      <OnboardingForm />
    </RequireAuth>
  )
}

function OnboardingForm() {
  const auth = useAuth()
  const storedLevel = auth.profile?.proficiency_level
  const [level, setLevel] = useState<OnboardingLevel | null>(
    storedLevel === "A1" || storedLevel === "A2" ? storedLevel : null,
  )
  const [targetText, setTargetText] = useState(
    String(auth.profile?.daily_learning_target ?? 10),
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!level) {
      setFormError("Choose a starting point.")
      return
    }
    const target = parseWholeTarget(targetText)
    if (target === null || targetError(target)) {
      setFormError("Choose a whole number from 5 to 50.")
      return
    }
    const supabase = getSupabase()
    if (!supabase || !auth.userId) {
      setFormError("Your session is missing. Sign in again.")
      return
    }

    setSubmitting(true)
    setFormError(null)
    const { error } = await supabase
      .from("profiles")
      .update({
        proficiency_level: level,
        daily_learning_target: target,
      })
      .eq("id", auth.userId)
    setSubmitting(false)
    if (error) {
      setFormError(error.message)
      return
    }
    await auth.refresh()
  }

  return (
    <>
      <PageHeading
        title="Start learning"
        lede="Two choices, then the progress board. You can change both later in Settings."
      />
      <form className="max-w-xl" onSubmit={(event) => void onSubmit(event)}>
        <StudyPreferences
          level={level}
          targetText={targetText}
          onLevel={setLevel}
          onTargetText={setTargetText}
        />
        {formError ? (
          <p className="mt-4 text-lg text-danger" role="alert">
            {formError}
          </p>
        ) : null}
        <button
          type="submit"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-copper px-5 py-3 font-semibold text-copper-ink disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? "Saving…" : "Continue"}
        </button>
      </form>
    </>
  )
}
