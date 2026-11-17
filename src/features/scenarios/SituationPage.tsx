import { Volume2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router"
import { EmptyState } from "../../components/ui/EmptyState.tsx"
import { PageHeading } from "../../components/ui/PageHeading.tsx"
import { getSupabase } from "../../lib/supabase/client.ts"
import { useAuth } from "../auth/RequireAuth.tsx"
import { requiredCorrect } from "../sentence-builder/validate.ts"
import { loadSituation, loadSituationList, type SituationListResult, type SituationProgress, type SituationResult } from "./load.ts"
import { situationScoreRow } from "./score.ts"
import { SituationExerciseCard } from "./SituationExercise.tsx"

const cardClass = "block rounded-2xl border border-line bg-card px-5 py-4 text-left transition-colors hover:bg-raised"
const actionClass = "inline-flex min-h-12 items-center justify-center rounded-xl bg-copper px-5 py-3 font-semibold text-copper-ink"

function speak(text: string) {
  if (!("speechSynthesis" in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = "es-ES"
  window.speechSynthesis.speak(utterance)
}

function statusFor(progress: SituationProgress | undefined): string {
  if (!progress) return "Not started"
  return `${progress.correctCount} of ${progress.totalCount}${progress.finished ? " · Finished" : ""}`
}

export function SituationListPage() {
  const auth = useAuth()
  const [result, setResult] = useState<SituationListResult | { status: "loading" }>({ status: "loading" })

  useEffect(() => {
    const userId = auth.userId
    if (!userId) return
    let active = true
    void loadSituationList(getSupabase(), userId).then((next) => {
      if (active) setResult(next)
    })
    return () => {
      active = false
    }
  }, [auth.userId])

  if (!getSupabase() || result.status === "unconfigured") {
    return (
      <>
        <PageHeading title="Real-Life Spanish" lede="Spanish for situations you will actually be in." />
        <EmptyState>
          Real-life Spanish is not connected. Add the Supabase keys, run the situations SQL, and seed the dialogues. This page does not show a sample dialogue.
        </EmptyState>
      </>
    )
  }
  if (result.status === "loading") return <p className="text-lg text-muted">Loading situations…</p>
  if (result.status === "error") {
    return (
      <>
        <PageHeading title="Real-Life Spanish" lede="Spanish for situations you will actually be in." />
        <p className="mt-6 text-lg text-danger" role="alert">{result.message}</p>
      </>
    )
  }
  if (result.status === "empty") {
    return (
      <>
        <PageHeading title="Real-Life Spanish" lede="Spanish for situations you will actually be in." />
        <EmptyState>
          The situations are not loaded yet. Run supabase/migrations/0006_scenarios.sql in the SQL editor, then npm run seed. This page does not show a sample dialogue.
        </EmptyState>
      </>
    )
  }

  return (
    <>
      <PageHeading title="Real-Life Spanish" lede="Twelve situations from Spain. These exercises do not use today's vocabulary target." />
      <ul className="mt-8 grid gap-3">
        {result.situations.map((situation) => {
          const row = result.progress.find((item) => item.situationId === situation.id)
          return (
            <li key={situation.id}>
              <Link className={cardClass} to={`/real-life-spanish/${situation.id}`}>
                <span className="block text-lg font-semibold text-cream">{situation.title}</span>
                <span className="mt-1 block text-muted">{situation.aim}</span>
                <span className="mt-2 block text-cream">{statusFor(row)}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export function SituationRoute() {
  const auth = useAuth()
  const { situationId } = useParams()
  const [result, setResult] = useState<SituationResult | { status: "loading" }>({ status: "loading" })
  const [phase, setPhase] = useState<"read" | "quiz" | "summary">("read")
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [run, setRun] = useState(0)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    const userId = auth.userId
    if (!userId || !situationId) return
    let active = true
    void loadSituation(getSupabase(), userId, situationId).then((next) => {
      if (active) setResult(next)
    })
    return () => {
      active = false
    }
  }, [auth.userId, situationId])

  const ready = result.status === "ready" ? result : null

  useEffect(() => {
    if (phase !== "summary" || !ready) return
    const userId = auth.userId
    const supabase = getSupabase()
    if (!userId || !supabase) return
    let active = true
    void supabase
      .from("user_situation_progress")
      .upsert(situationScoreRow(userId, ready.situation.id, correct, ready.exercises.length, new Date().toISOString()), {
        onConflict: "user_id,situation_id",
      })
      .then(({ error }) => {
        if (!active) return
        if (error) {
          setSaveState("error")
          setSaveError(error.message)
          return
        }
        setSaveState("saved")
      })
    return () => {
      active = false
    }
  }, [phase, run, ready, auth.userId, correct])

  if (!situationId || result.status === "missing") {
    return (
      <>
        <PageHeading title="Situation not found" lede="That situation is not in the course." />
        <Link className="mt-6 inline-block text-copper underline underline-offset-4" to="/real-life-spanish">
          All situations
        </Link>
      </>
    )
  }
  if (!getSupabase() || result.status === "unconfigured") {
    return (
      <>
        <PageHeading title="Real-Life Spanish" lede="Spanish for situations you will actually be in." />
        <EmptyState>Real-life Spanish is not connected. This page does not show a sample dialogue.</EmptyState>
      </>
    )
  }
  if (result.status === "loading") return <p className="text-lg text-muted">Loading the situation…</p>
  if (result.status === "error") {
    return (
      <>
        <PageHeading title="Real-Life Spanish" lede="Spanish for situations you will actually be in." />
        <p className="mt-6 text-lg text-danger" role="alert">{result.message}</p>
      </>
    )
  }

  const needed = result.exercises.length === 0 ? 0 : requiredCorrect(result.exercises.length)
  const exercise = result.exercises[index]

  function restart() {
    setPhase("quiz")
    setIndex(0)
    setCorrect(0)
    setSaveState("idle")
    setSaveError(null)
  }

  async function saveAgain() {
    const userId = auth.userId
    const supabase = getSupabase()
    if (!userId || !supabase || result.status !== "ready") return
    setSaveState("saving")
    const { error } = await supabase
      .from("user_situation_progress")
      .upsert(situationScoreRow(userId, result.situation.id, correct, result.exercises.length, new Date().toISOString()), {
        onConflict: "user_id,situation_id",
      })
    if (error) {
      setSaveState("error")
      setSaveError(error.message)
      return
    }
    setSaveState("saved")
  }

  return (
    <>
      <Link className="text-copper underline underline-offset-4" to="/real-life-spanish">
        All situations
      </Link>
      <div className="mt-4">
        <PageHeading title={result.situation.title} lede={result.situation.aim} />
      </div>
      {phase === "read" ? (
        <>
          {result.situation.spainNote ? <p className="mt-4 max-w-prose text-lg text-cream">{result.situation.spainNote}</p> : null}
          {result.progress ? (
            <p className="mt-4 text-cream">
              Last try: {result.progress.correctCount} of {result.progress.totalCount}
              {result.progress.finished ? ". Finished." : "."}
            </p>
          ) : null}
          <h2 className="mt-8 text-xl font-semibold text-cream">Phrases</h2>
          <ul className="mt-3 grid gap-3">
            {result.phrases.map((phrase) => (
              <li key={phrase.id} className="rounded-2xl border border-line bg-card px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xl text-cream">{phrase.spanish}</p>
                  <button
                    type="button"
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-line text-cream"
                    aria-label={`Listen to ${phrase.spanish}`}
                    onClick={() => speak(phrase.spanish)}
                  >
                    <Volume2 aria-hidden="true" className="size-5" />
                  </button>
                </div>
                <p className="mt-1 text-muted">{phrase.english}</p>
              </li>
            ))}
          </ul>
          <h2 className="mt-8 text-xl font-semibold text-cream">Dialogue</h2>
          <ol className="mt-3 grid gap-3">
            {result.turns.map((turn) => (
              <li key={turn.id} className="rounded-2xl border border-line bg-card px-5 py-4">
                <p className="text-sm font-semibold text-copper">{turn.speaker}</p>
                <div className="mt-1 flex items-start justify-between gap-3">
                  <p className="text-xl text-cream">{turn.spanish}</p>
                  <button
                    type="button"
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-line text-cream"
                    aria-label={`Listen to ${turn.spanish}`}
                    onClick={() => speak(turn.spanish)}
                  >
                    <Volume2 aria-hidden="true" className="size-5" />
                  </button>
                </div>
                <p className="mt-1 text-muted">{turn.english}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-prose text-muted">
            {result.exercises.length} exercises. {needed} correct finishes the situation. Try again replaces the stored score.
          </p>
          <button
            type="button"
            className={`${actionClass} mt-4`}
            disabled={result.exercises.length === 0}
            onClick={() => {
              setIndex(0)
              setCorrect(0)
              setPhase("quiz")
            }}
          >
            Start the exercises
          </button>
        </>
      ) : null}
      {phase === "quiz" && exercise ? (
        <SituationExerciseCard
          key={exercise.id}
          exercise={exercise}
          position={`${index + 1} of ${result.exercises.length}`}
          onAdvance={(right) => {
            const nextCorrect = correct + (right ? 1 : 0)
            if (index + 1 >= result.exercises.length) {
              setCorrect(nextCorrect)
              setSaveState("saving")
              setSaveError(null)
              setPhase("summary")
              setRun((value) => value + 1)
              return
            }
            setCorrect(nextCorrect)
            setIndex(index + 1)
          }}
        />
      ) : null}
      {phase === "summary" ? (
        <div className="mt-8 max-w-prose rounded-2xl border border-line bg-card px-5 py-6">
          <h2 className="text-2xl font-semibold text-cream">
            {correct} of {result.exercises.length}
          </h2>
          <p className="mt-3 text-lg text-cream">
            {correct >= needed ? "This situation is finished." : `You need ${needed} correct answers to finish this situation.`}
          </p>
          <p className="mt-2 text-muted">Another try replaces this score. A situation does not use the vocabulary target.</p>
          {saveState === "saving" ? <p className="mt-3 text-muted">Saving your score…</p> : null}
          {saveState === "saved" ? <p className="mt-3 text-cream">Score saved.</p> : null}
          {saveState === "error" ? (
            <p className="mt-3 text-danger" role="alert">
              {saveError}{" "}
              <button type="button" className="underline" onClick={() => void saveAgain()}>
                Save again
              </button>
            </p>
          ) : null}
          <button type="button" className={`${actionClass} mt-5`} onClick={restart}>
            Try again
          </button>
        </div>
      ) : null}
    </>
  )
}
