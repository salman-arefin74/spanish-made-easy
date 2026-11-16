import { Volume2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router"
import { EmptyState } from "../../components/ui/EmptyState.tsx"
import { PageHeading } from "../../components/ui/PageHeading.tsx"
import { getSupabase } from "../../lib/supabase/client.ts"
import { useAuth } from "../auth/RequireAuth.tsx"
import { ExerciseCard } from "./ExerciseCard.tsx"
import {
  loadGrammarList,
  loadLesson,
  type GrammarListResult,
  type LessonResult,
  type TopicProgress,
  type TopicSummary,
} from "./load.ts"
import { grammarScoreRow } from "./score.ts"
import { requiredCorrect } from "./validate.ts"

const cardClass =
  "block rounded-2xl border border-line bg-card px-5 py-4 text-left transition-colors hover:bg-raised"
const actionClass =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-copper px-5 py-3 font-semibold text-copper-ink"

function speak(text: string) {
  if (!("speechSynthesis" in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = "es-ES"
  window.speechSynthesis.speak(utterance)
}

function progressFor(progress: TopicProgress[], topicId: string): TopicProgress | undefined {
  return progress.find((row) => row.topicId === topicId)
}

function PrerequisiteNote({
  topic,
  topics,
  progress,
}: {
  topic: TopicSummary
  topics: TopicSummary[]
  progress: TopicProgress[]
}) {
  if (!topic.prerequisiteId) return null
  const earlier = topics.find((item) => item.id === topic.prerequisiteId)
  const finished = progressFor(progress, topic.prerequisiteId)?.finished === true
  if (!earlier || finished) return null
  return (
    <p className="mt-3 text-cream">
      Study {earlier.title} first. This lesson still opens.
    </p>
  )
}

export function SentenceBuilderPage() {
  const auth = useAuth()
  const [result, setResult] = useState<GrammarListResult | { status: "loading" }>({ status: "loading" })

  useEffect(() => {
    const userId = auth.userId
    if (!userId) return
    let active = true
    void loadGrammarList(getSupabase(), userId).then((next) => {
      if (active) setResult(next)
    })
    return () => {
      active = false
    }
  }, [auth.userId])

  if (result.status === "loading") return <p className="text-lg text-muted">Loading the lessons…</p>
  if (result.status === "unconfigured") {
    return (
      <>
        <PageHeading title="Sentence Builder" lede="How words become sentences." />
        <EmptyState>
          The lessons are not connected. Add the Supabase keys, run the grammar SQL, and seed the lessons. This page does not show sample sentences.
        </EmptyState>
      </>
    )
  }
  if (result.status === "error") {
    return (
      <>
        <PageHeading title="Sentence Builder" lede="How words become sentences." />
        <p className="mt-6 text-lg text-danger" role="alert">
          {result.message}
        </p>
      </>
    )
  }
  if (result.status === "empty") {
    return (
      <>
        <PageHeading title="Sentence Builder" lede="How words become sentences." />
        <EmptyState>
          The lessons are not loaded yet. Run supabase/migrations/0003_grammar.sql in the SQL editor, then npm run seed. This page does not show sample sentences.
        </EmptyState>
      </>
    )
  }

  return (
    <>
      <PageHeading
        title="Sentence Builder"
        lede="Grammar for Spanish from Spain. These lessons do not use today's vocabulary target."
      />
      <ul className="mt-8 grid gap-3">
        {result.topics.map((topic) => {
          const row = progressFor(result.progress, topic.id)
          const status = row
            ? `${row.correctCount} of ${row.totalCount}${row.finished ? " · Finished" : ""}`
            : "Not started"
          return (
            <li key={topic.id}>
              <Link className={cardClass} to={`/sentence-builder/${topic.id}`}>
                <span className="block text-lg font-semibold text-cream">{topic.title}</span>
                <span className="mt-1 block text-muted">{status}</span>
                <PrerequisiteNote topic={topic} topics={result.topics} progress={result.progress} />
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export function LessonRoute() {
  const auth = useAuth()
  const { topicId } = useParams()
  const [result, setResult] = useState<LessonResult | { status: "loading" }>({ status: "loading" })
  const [phase, setPhase] = useState<"read" | "quiz" | "summary">("read")
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [run, setRun] = useState(0)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    const userId = auth.userId
    if (!userId || !topicId) return
    let active = true
    void loadLesson(getSupabase(), userId, topicId).then((next) => {
      if (active) setResult(next)
    })
    return () => {
      active = false
    }
  }, [auth.userId, topicId])

  async function save(total: number) {
    const userId = auth.userId
    const supabase = getSupabase()
    const topic = result.status === "ready" ? result.topic : null
    if (!userId || !supabase || !topic) return
    setSaveState("saving")
    setSaveError(null)
    const { error } = await supabase.from("user_grammar_progress").upsert(
      grammarScoreRow(userId, topic.id, correct, total, new Date().toISOString()),
      { onConflict: "user_id,topic_id" },
    )
    if (error) {
      setSaveState("error")
      setSaveError(error.message)
      return
    }
    setSaveState("saved")
  }

  const ready = result.status === "ready" ? result : null

  useEffect(() => {
    if (phase !== "summary" || !ready) return
    const userId = auth.userId
    const supabase = getSupabase()
    if (!userId || !supabase) return
    let active = true
    void supabase
      .from("user_grammar_progress")
      .upsert(grammarScoreRow(userId, ready.topic.id, correct, ready.exercises.length, new Date().toISOString()), {
        onConflict: "user_id,topic_id",
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

  if (!topicId || result.status === "missing") {
    return (
      <>
        <PageHeading title="Lesson not found" lede="That grammar topic is not in the bank." />
        <Link className="mt-6 inline-block text-copper underline underline-offset-4" to="/sentence-builder">
          Back to Sentence Builder
        </Link>
      </>
    )
  }
  if (result.status === "loading") return <p className="text-lg text-muted">Loading the lesson…</p>
  if (result.status === "unconfigured") {
    return (
      <>
        <PageHeading title="Sentence Builder" lede="How words become sentences." />
        <EmptyState>
          The lessons are not connected. Add the Supabase keys, run the grammar SQL, and seed the lessons. This page does not show sample sentences.
        </EmptyState>
      </>
    )
  }
  if (result.status === "error") {
    return (
      <>
        <PageHeading title="Sentence Builder" lede="How words become sentences." />
        <p className="mt-6 text-lg text-danger" role="alert">
          {result.message}
        </p>
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

  return (
    <>
      <Link className="text-copper underline underline-offset-4" to="/sentence-builder">
        All topics
      </Link>
      <div className="mt-4">
        <PageHeading title={result.topic.title} lede="A grammar lesson for Spanish from Spain." />
      </div>
      <PrerequisiteNote topic={result.topic} topics={result.catalog} progress={result.progress} />
      {phase === "read" ? (
        <>
          {result.topic.explanation.split("\n\n").map((paragraph) => (
            <p key={paragraph} className="mt-4 max-w-prose text-lg leading-relaxed text-cream">
              {paragraph}
            </p>
          ))}
          <h2 className="mt-8 text-xl font-semibold text-cream">Examples</h2>
          <ul className="mt-3 grid gap-3">
            {result.examples.map((example) => (
              <li key={example.id} className="rounded-2xl border border-line bg-card px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xl text-cream">{example.spanish}</p>
                  <button
                    type="button"
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-line text-cream"
                    aria-label={`Listen to ${example.spanish}`}
                    onClick={() => speak(example.spanish)}
                  >
                    <Volume2 aria-hidden="true" className="size-5" />
                  </button>
                </div>
                <p className="mt-1 text-muted">{example.english}</p>
              </li>
            ))}
          </ul>
          <h2 className="mt-8 text-xl font-semibold text-cream">A common mistake</h2>
          <p className="mt-3 max-w-prose text-lg leading-relaxed text-cream">{result.topic.commonMistake}</p>
          <h2 className="mt-8 text-xl font-semibold text-cream">Patterns you can reuse</h2>
          <ul className="mt-3 grid gap-3">
            {result.patterns.map((pattern) => (
              <li key={pattern.id} className="rounded-2xl border border-line bg-card px-5 py-4">
                <p className="text-lg font-semibold text-cream">{pattern.title}</p>
                <p className="mt-1 text-cream">{pattern.frame}</p>
                <ul className="mt-2 grid gap-1">
                  {pattern.slots.map((slot) => (
                    <li key={slot.name} className="text-muted">
                      {slot.name}: {slot.description}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-prose text-muted">
            {result.exercises.length} exercises. {needed} correct finishes the topic. Try again replaces the stored score.
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
        <ExerciseCard
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
            {correct >= needed
              ? "This topic is finished."
              : `You need ${needed} correct answers to finish this topic.`}
          </p>
          <p className="mt-2 text-muted">Another try replaces this score. Grammar does not use the vocabulary target.</p>
          {saveState === "saving" ? <p className="mt-3 text-muted">Saving your score…</p> : null}
          {saveState === "saved" ? <p className="mt-3 text-cream">Score saved.</p> : null}
          {saveState === "error" ? (
            <p className="mt-3 text-danger" role="alert">
              {saveError}{" "}
              <button type="button" className="underline" onClick={() => void save(result.exercises.length)}>
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
