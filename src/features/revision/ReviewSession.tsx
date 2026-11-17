import { Volume2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router"
import { scheduleReview, shiftDate, type ReviewGrade } from "../../algorithms/spaced-repetition/schedule.ts"
import { EmptyState } from "../../components/ui/EmptyState.tsx"
import { PageHeading } from "../../components/ui/PageHeading.tsx"
import { getSupabase } from "../../lib/supabase/client.ts"
import { useAuth } from "../auth/RequireAuth.tsx"
import { recordStudyDay } from "../progress/studyDay.ts"
import { localDateISO } from "../vocabulary/session.ts"
import type { StudyWord } from "../vocabulary/bank.ts"

const actionClass =
  "inline-flex min-h-14 items-center justify-center rounded-xl px-4 py-3 text-lg font-semibold disabled:opacity-50"

const grades: { grade: ReviewGrade; label: string }[] = [
  { grade: "again", label: "Again" },
  { grade: "hard", label: "Hard" },
  { grade: "good", label: "Good" },
  { grade: "easy", label: "Easy" },
]

export type ReviewItem = StudyWord & {
  intervalDays: number
  ease: number
  repetitions: number
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = "es-ES"
  window.speechSynthesis.speak(utterance)
}

function displaySpanish(word: StudyWord): string {
  return word.article ? `${word.article} ${word.spanish}` : word.spanish
}

export function ReviewCards({
  items,
  onGrade,
}: {
  items: ReviewItem[]
  onGrade: (item: ReviewItem, grade: ReviewGrade) => Promise<void>
}) {
  const [queue, setQueue] = useState(items)
  const [revealed, setRevealed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [finished, setFinished] = useState<ReviewItem[]>([])
  const current = queue[0] ?? null

  async function choose(grade: ReviewGrade) {
    if (!current || saving) return
    setSaving(true)
    setError(null)
    try {
      await onGrade(current, grade)
      setFinished((previous) => [...previous, current])
      setQueue((previous) => previous.slice(1))
      setRevealed(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The review was not saved.")
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!current || saving) return
      if (event.key === "ArrowDown" && !revealed) {
        event.preventDefault()
        setRevealed(true)
      }
      const grade = grades[Number(event.key) - 1]
      if (revealed && grade) {
        event.preventDefault()
        void choose(grade.grade)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  if (!current) {
    return (
      <>
        <PageHeading title="Revision" lede="Every word from this review." />
        <ul className="mt-6 space-y-3">
          {finished.map((word) => (
            <li key={word.id} className="rounded-2xl border border-line bg-card px-5 py-4">
              <span className="block text-xl text-cream">{displaySpanish(word)}</span>
              <span className="mt-1 block text-muted">{word.english}</span>
            </li>
          ))}
        </ul>
        <Link className={`${actionClass} mt-8 border border-line text-cream`} to="/">
          Progress
        </Link>
      </>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <p className="text-lg text-muted">Revision</p>
      <p className="mt-2 text-cream">
        {finished.length + 1} of {finished.length + queue.length}
      </p>
      <div className="mt-8 rounded-3xl border border-line bg-card px-6 py-10 text-center">
        <p className="text-sm tracking-wide text-muted uppercase">
          {current.level} · {current.partOfSpeech}
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <h1 className="text-5xl font-semibold tracking-tight text-cream">{displaySpanish(current)}</h1>
          <button
            type="button"
            className="inline-flex size-12 items-center justify-center rounded-full border border-line text-cream"
            aria-label={`Pronounce ${displaySpanish(current)}`}
            onClick={() => speak(displaySpanish(current))}
          >
            <Volume2 aria-hidden="true" className="size-5" />
          </button>
        </div>
        {revealed ? (
          <div className="card-reveal mt-8 text-left">
            <p className="text-2xl text-cream">{current.english}</p>
            <p className="mt-4 text-lg text-cream">{current.exampleSpanish}</p>
            <p className="mt-1 text-lg text-muted">{current.exampleEnglish}</p>
            {current.spainNote ? <p className="mt-4 text-muted">{current.spainNote}</p> : null}
          </div>
        ) : (
          <button type="button" className={`${actionClass} mt-8 border border-line text-cream`} onClick={() => setRevealed(true)}>
            Show meaning
          </button>
        )}
      </div>
      {revealed ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {grades.map((item) => (
            <button
              key={item.grade}
              type="button"
              className={item.grade === "good" ? `${actionClass} bg-copper text-copper-ink` : `${actionClass} border border-line text-cream`}
              disabled={saving}
              onClick={() => void choose(item.grade)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      <p className="mt-4 text-sm text-muted">Down shows the meaning. Then 1 is Again, 2 is Hard, 3 is Good, and 4 is Easy.</p>
      {error ? (
        <p className="mt-4 text-lg text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function ReviewPage() {
  const auth = useAuth()
  const [state, setState] = useState<{ status: "loading" | "empty" | "ready" | "unconfigured" | "error"; items: ReviewItem[]; message: string; today: string }>({
    status: "loading",
    items: [],
    message: "",
    today: "",
  })

  useEffect(() => {
    const userId = auth.userId
    if (!userId) return
    const supabase = getSupabase()
    if (!supabase) return
    let active = true
    void Promise.all([
      supabase
        .from("words")
        .select("id, category_id, spanish, english, part_of_speech, level, example_spanish, example_english, article, plural, spain_note, sort_order"),
      supabase
        .from("user_word_progress")
        .select("word_id, next_review_on, interval_days, ease, repetitions")
        .eq("user_id", userId),
    ]).then(([words, progress]) => {
      if (!active) return
      const today = localDateISO(new Date())
      const failure = words.error ?? progress.error
      if (failure) {
        const sentence = failure.message.endsWith(".") ? failure.message : `${failure.message}.`
        setState({ status: "error", items: [], message: sentence, today })
        return
      }
      const byId = new Map((words.data ?? []).map((word) => [word.id, word]))
      const items = (progress.data ?? [])
        .filter((row) => row.next_review_on <= today)
        .flatMap((row) => {
          const word = byId.get(row.word_id)
          if (!word) return []
          return [
            {
              id: word.id,
              categoryId: word.category_id,
              spanish: word.spanish,
              english: word.english,
              partOfSpeech: word.part_of_speech,
              level: word.level,
              exampleSpanish: word.example_spanish,
              exampleEnglish: word.example_english,
              article: word.article,
              plural: word.plural,
              spainNote: word.spain_note,
              sortOrder: word.sort_order,
              intervalDays: row.interval_days,
              ease: Number(row.ease),
              repetitions: row.repetitions,
            },
          ]
        })
      setState({ status: items.length === 0 ? "empty" : "ready", items, message: "", today })
    })
    return () => {
      active = false
    }
  }, [auth.userId])

  async function onGrade(item: ReviewItem, grade: ReviewGrade) {
    const supabase = getSupabase()
    if (!supabase || !auth.userId) throw new Error("Your session is missing. Sign in again.")
    const today = state.today || localDateISO(new Date())
    const next = scheduleReview(
      { intervalDays: item.intervalDays, ease: item.ease, repetitions: item.repetitions },
      grade,
    )
    const { error } = await supabase
      .from("user_word_progress")
      .update({
        last_response: grade,
        last_reviewed_on: today,
        next_review_on: shiftDate(today, next.intervalDays),
        interval_days: next.intervalDays,
        ease: next.ease,
        repetitions: next.repetitions,
      })
      .eq("user_id", auth.userId)
      .eq("word_id", item.id)
    if (error) {
      const sentence = error.message.endsWith(".") ? error.message : `${error.message}.`
      const hint = /check constraint|last_response/i.test(error.message)
        ? " Run supabase/migrations/0005_revision_and_exams.sql in the SQL editor."
        : ""
      throw new Error(`${sentence}${hint}`)
    }
    await recordStudyDay(supabase, auth.userId, today)
  }

  if (!getSupabase()) {
    return (
      <>
        <PageHeading title="Revision" lede="Words that are ready to review." />
        <EmptyState>Revision is not connected. Add the Supabase keys and run the revision SQL. This page does not show a sample queue.</EmptyState>
      </>
    )
  }
  if (state.status === "loading") return <p className="text-lg text-muted">Loading reviews…</p>
  if (state.status === "error") {
    return (
      <>
        <PageHeading title="Revision" lede="Words that are ready to review." />
        <p className="mt-6 text-lg text-danger" role="alert">{state.message}</p>
      </>
    )
  }
  if (state.status === "empty") {
    return (
      <>
        <PageHeading title="Revision" lede="Nothing is due today." />
        <EmptyState>Words you studied become due on the next local day. There is no sample queue on this page.</EmptyState>
      </>
    )
  }
  return <ReviewCards items={state.items} onGrade={onGrade} />
}
