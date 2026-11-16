import { Volume2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router"
import { EmptyState } from "../../components/ui/EmptyState.tsx"
import { PageHeading } from "../../components/ui/PageHeading.tsx"
import { useAuth } from "../auth/RequireAuth.tsx"
import { getSupabase } from "../../lib/supabase/client.ts"
import { loadBank, type BankResult, type StudyWord } from "./bank.ts"
import {
  answerCard,
  localDateISO,
  nextLocalDateISO,
  orderForToday,
  selectNewWords,
  sessionPosition,
  slotsRemaining,
  startSession,
  type CardAnswer,
  type SessionState,
} from "./session.ts"

const actionClass =
  "inline-flex min-h-14 items-center justify-center rounded-xl px-5 py-3 text-lg font-semibold disabled:opacity-50"

function displaySpanish(word: StudyWord): string {
  return word.article ? `${word.article} ${word.spanish}` : word.spanish
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = "es-ES"
  window.speechSynthesis.speak(utterance)
}

export function FlashcardSession({
  title,
  words,
  onRecord,
}: {
  title: string
  words: StudyWord[]
  onRecord: (word: StudyWord, answer: CardAnswer) => Promise<void>
}) {
  const [state, setState] = useState<SessionState>(() => startSession(words.map((word) => word.id)))
  const [revealed, setRevealed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const current = state.queue[0]
  const currentWord = words.find((word) => word.id === current?.id) ?? null

  async function choose(answer: CardAnswer) {
    if (!current || !currentWord || saving) return
    const finishing = answer === "know" || current.requeued
    setSaving(true)
    setError(null)
    try {
      if (finishing) await onRecord(currentWord, answer)
      setState((previous) => answerCard(previous, answer))
      setRevealed(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The answer was not saved.")
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!currentWord || saving) return
      if (event.key === "ArrowDown" && !revealed) {
        event.preventDefault()
        setRevealed(true)
      }
      if (event.key === "ArrowLeft" && revealed) {
        event.preventDefault()
        void choose("still_learning")
      }
      if (event.key === "ArrowRight" && revealed) {
        event.preventDefault()
        void choose("know")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  if (!currentWord) {
    return (
      <>
        <PageHeading title={title} lede="Every word from this session." />
        <p className="mt-6 text-lg text-cream">{sessionPosition(state)} finished.</p>
        <ul className="mt-6 space-y-3">
          {state.finished.map((card) => {
            const word = words.find((item) => item.id === card.id)
            if (!word) return null
            return (
              <li key={card.id} className="rounded-2xl border border-line bg-card px-5 py-4">
                <span className="block text-xl text-cream">{displaySpanish(word)}</span>
                <span className="mt-1 block text-muted">{word.english}</span>
              </li>
            )
          })}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className={`${actionClass} bg-copper text-copper-ink`} to="/vocabulary">
            Study more
          </Link>
          <Link className={`${actionClass} border border-line text-cream`} to="/">
            Progress
          </Link>
        </div>
      </>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <p className="text-lg text-muted">{title}</p>
      <p className="mt-2 text-cream" aria-live="polite">
        {sessionPosition(state)}
      </p>
      <div
        className="mt-3 h-1 overflow-hidden rounded-full bg-raised"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={state.total}
        aria-valuenow={state.finished.length}
        aria-label={sessionPosition(state)}
      >
        <div
          className="h-full bg-copper"
          style={{ width: state.total === 0 ? "0%" : `${(state.finished.length / state.total) * 100}%` }}
        />
      </div>
      <div className="mt-8 rounded-3xl border border-line bg-card px-6 py-10 text-center">
        <p className="text-sm tracking-wide text-muted uppercase">
          {currentWord.level} · {currentWord.partOfSpeech}
          {currentWord.plural ? ` · plural ${currentWord.plural}` : ""}
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <h1 className="text-5xl font-semibold tracking-tight text-cream">{displaySpanish(currentWord)}</h1>
          <button
            type="button"
            className="inline-flex size-12 items-center justify-center rounded-full border border-line text-cream"
            aria-label={`Pronounce ${displaySpanish(currentWord)}`}
            onClick={() => speak(displaySpanish(currentWord))}
          >
            <Volume2 aria-hidden="true" className="size-5" />
          </button>
        </div>
        {revealed ? (
          <div className="card-reveal mt-8 text-left">
            <p className="text-2xl text-cream">{currentWord.english}</p>
            <p className="mt-4 text-lg text-cream">{currentWord.exampleSpanish}</p>
            <p className="mt-1 text-lg text-muted">{currentWord.exampleEnglish}</p>
            {currentWord.spainNote ? <p className="mt-4 text-muted">{currentWord.spainNote}</p> : null}
          </div>
        ) : (
          <button
            type="button"
            className={`${actionClass} mt-8 border border-line text-cream`}
            onClick={() => setRevealed(true)}
          >
            Show meaning
          </button>
        )}
      </div>
      {revealed ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            className={`${actionClass} border border-line text-cream`}
            disabled={saving}
            onClick={() => void choose("still_learning")}
          >
            Still learning
          </button>
          <button
            type="button"
            className={`${actionClass} bg-copper text-copper-ink`}
            disabled={saving}
            onClick={() => void choose("know")}
          >
            I know this
          </button>
        </div>
      ) : null}
      <p className="mt-4 text-sm text-muted">Down shows the meaning. Left is Still learning. Right is I know this.</p>
      {error ? (
        <p className="mt-4 text-lg text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function VocabularySessionPage() {
  const auth = useAuth()
  const params = useParams()
  const categoryId = params.categoryId ?? ""
  const [result, setResult] = useState<BankResult | { status: "loading" }>({ status: "loading" })
  const [today, setToday] = useState<string | null>(null)

  useEffect(() => {
    const userId = auth.userId
    if (!userId) return
    let active = true
    void loadBank(getSupabase(), userId).then((next) => {
      if (!active) return
      setToday(localDateISO(new Date()))
      setResult(next)
    })
    return () => {
      active = false
    }
  }, [auth.userId])

  async function onRecord(word: StudyWord, answer: CardAnswer) {
    const supabase = getSupabase()
    if (!supabase || !auth.userId) throw new Error("Your session is missing. Sign in again.")
    const today = localDateISO(new Date())
    const { error } = await supabase.from("user_word_progress").insert({
      user_id: auth.userId,
      word_id: word.id,
      introduced_on: today,
      last_response: answer,
      last_reviewed_on: today,
      next_review_on: nextLocalDateISO(new Date()),
      interval_days: 1,
      ease: 2.5,
      repetitions: answer === "know" ? 1 : 0,
    })
    if (error) throw new Error(error.message)
  }

  if (result.status === "loading" || today === null) {
    return <p className="text-lg text-muted">Loading the word bank…</p>
  }
  if (result.status !== "ready") {
    return (
      <>
        <PageHeading title="Vocabulary" lede="The word bank is not available in this session." />
        <EmptyState>Open Vocabulary after the bank has been seeded. There is no sample deck on this page.</EmptyState>
      </>
    )
  }

  const introducedToday = result.progress.filter((row) => row.introducedOn === today).length
  const target = auth.profile?.daily_learning_target ?? 10
  const remaining = slotsRemaining(target, introducedToday)
  const introduced = new Set(result.progress.map((row) => row.wordId))
  const level = auth.profile?.proficiency_level === "A2" ? "A2" : "A1"
  const category = result.categories.find((item) => item.id === categoryId)
  const categoryOrder = new Map(result.categories.map((item) => [item.id, item.sortOrder]))
  const pool =
    categoryId === "today"
      ? orderForToday(
          [...result.words].sort((a, b) => {
            const byCategory = (categoryOrder.get(a.categoryId) ?? 0) - (categoryOrder.get(b.categoryId) ?? 0)
            return byCategory || a.sortOrder - b.sortOrder
          }),
          level,
        )
      : result.words
          .filter((word) => word.categoryId === categoryId)
          .sort((a, b) => a.sortOrder - b.sortOrder)
  const selected = selectNewWords(pool, introduced, remaining)
  const title = categoryId === "today" ? "Today's words" : (category?.label ?? "Vocabulary")

  if (!category && categoryId !== "today") {
    return (
      <>
        <PageHeading title="Category not found" lede="That category is not in the word bank." />
        <EmptyState>Go back to Vocabulary and choose a category from the list.</EmptyState>
      </>
    )
  }
  if (remaining === 0) {
    return (
      <>
        <PageHeading title={title} lede="Today's vocabulary session is full." />
        <EmptyState>
          {`You have already introduced ${target} words today. New words start again on the next local day.`}
        </EmptyState>
      </>
    )
  }
  if (selected.length === 0) {
    return (
      <>
        <PageHeading title={title} lede="There are no new words left here." />
        <EmptyState>Every word in this set is already introduced. Choose another category, or come back tomorrow for reviews.</EmptyState>
      </>
    )
  }

  return <FlashcardSession key={selected.map((word) => word.id).join(",")} title={title} words={selected} onRecord={onRecord} />
}
