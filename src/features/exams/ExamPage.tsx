import { useEffect, useState } from "react"
import { EmptyState } from "../../components/ui/EmptyState.tsx"
import { PageHeading } from "../../components/ui/PageHeading.tsx"
import { getSupabase } from "../../lib/supabase/client.ts"
import { useAuth } from "../auth/RequireAuth.tsx"
import { assembleExam, gradeAnswer, type ExamQuestion, type ExamSet, type ExamWord } from "./assemble.ts"

const actionClass =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-copper px-5 py-3 font-semibold text-copper-ink disabled:opacity-50"

const answerClass = "mt-6 w-full rounded-xl border border-line bg-ink px-4 py-3 text-lg text-cream"

export function ExamAnswerForm({
  value,
  onChange,
  onCheck,
}: {
  value: string
  onChange: (value: string) => void
  onCheck: () => void
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!value.trim()) return
        onCheck()
      }}
    >
      <input
        className={answerClass}
        aria-label="Your answer"
        value={value}
        autoFocus
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return
          event.preventDefault()
          event.currentTarget.form?.requestSubmit()
        }}
      />
      <button type="submit" className={`${actionClass} mt-6`} disabled={!value.trim()}>
        Check
      </button>
    </form>
  )
}

type Attempt = { id: string; examSet: string; correct: number; total: number }

export function ExamPage() {
  const auth = useAuth()
  const [words, setWords] = useState<ExamWord[] | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<ExamQuestion[] | null>(null)
  const [examSet, setExamSet] = useState<ExamSet>("A1")
  const [index, setIndex] = useState(0)
  const [choice, setChoice] = useState("")
  const [typed, setTyped] = useState("")
  const [checked, setChecked] = useState<boolean | null>(null)
  const [correct, setCorrect] = useState(0)
  const [misses, setMisses] = useState<ExamQuestion[]>([])
  const [done, setDone] = useState(false)
  const [saveNote, setSaveNote] = useState<string | null>(null)

  useEffect(() => {
    const userId = auth.userId
    if (!userId) return
    const supabase = getSupabase()
    if (!supabase) return
    let active = true
    void Promise.all([
      supabase.from("words").select("id, spanish, english, part_of_speech, level, example_spanish, example_english, article"),
      supabase.from("quiz_attempts").select("id, exam_set, correct_count, total_count, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    ]).then(([wordResult, attemptResult]) => {
      if (!active) return
      if (wordResult.error) {
        setError(wordResult.error.message)
        setWords([])
        return
      }
      setWords(
        (wordResult.data ?? []).map((word) => ({
          id: word.id,
          spanish: word.spanish,
          english: word.english,
          partOfSpeech: word.part_of_speech,
          level: word.level,
          exampleSpanish: word.example_spanish,
          exampleEnglish: word.example_english,
          article: word.article,
        })),
      )
      if (!attemptResult.error) {
        setAttempts(
          (attemptResult.data ?? []).map((row) => ({
            id: row.id,
            examSet: row.exam_set,
            correct: row.correct_count,
            total: row.total_count,
          })),
        )
      }
    })
    return () => {
      active = false
    }
  }, [auth.userId])

  const level = auth.profile?.proficiency_level === "A2" ? "A2" : "A1"
  const question = questions?.[index] ?? null
  const given = question?.choices ? choice : typed

  function start(set: ExamSet) {
    if (!words) return
    const next = assembleExam(words, set, Date.now())
    if (next.length === 0) return
    setExamSet(set)
    setQuestions(next)
    setIndex(0)
    setChoice("")
    setTyped("")
    setChecked(null)
    setCorrect(0)
    setMisses([])
    setDone(false)
    setSaveNote(null)
  }

  async function finish(totalCorrect: number, missed: ExamQuestion[]) {
    setCorrect(totalCorrect)
    setMisses(missed)
    setDone(true)
    const supabase = getSupabase()
    if (!supabase || !auth.userId || !questions) return
    const { error: saveError } = await supabase.from("quiz_attempts").insert({
      user_id: auth.userId,
      exam_set: examSet,
      correct_count: totalCorrect,
      total_count: 15,
      answers: questions.map((item) => ({
        wordId: item.wordId,
        kind: item.kind,
        correct: !missed.some((miss) => miss.wordId === item.wordId && miss.kind === item.kind),
      })),
    })
    if (saveError) {
      const sentence = saveError.message.endsWith(".") ? saveError.message : `${saveError.message}.`
      const hint = /schema cache|could not find the table|does not exist/i.test(saveError.message)
        ? " Run supabase/migrations/0005_revision_and_exams.sql in the SQL editor."
        : ""
      setSaveNote(`${sentence}${hint}`)
      return
    }
    setSaveNote("Attempt saved.")
    setAttempts((previous) => [{ id: "latest", examSet, correct: totalCorrect, total: 15 }, ...previous].slice(0, 5))
  }

  function advance(right: boolean) {
    if (!question || !questions) return
    const nextCorrect = correct + (right ? 1 : 0)
    const nextMisses = right ? misses : [...misses, question]
    if (index + 1 >= questions.length) {
      void finish(nextCorrect, nextMisses)
      return
    }
    setCorrect(nextCorrect)
    setMisses(nextMisses)
    setIndex(index + 1)
    setChoice("")
    setTyped("")
    setChecked(null)
  }

  if (!getSupabase()) {
    return (
      <>
        <PageHeading title="Exams" lede="A check on what you can actually do." />
        <EmptyState>Exams are not connected. Add the Supabase keys and seed the word bank. This page does not show sample questions.</EmptyState>
      </>
    )
  }
  if (words === null) return <p className="text-lg text-muted">Loading exams…</p>
  if (error) {
    return (
      <>
        <PageHeading title="Exams" lede="A check on what you can actually do." />
        <p className="mt-6 text-lg text-danger" role="alert">{error}</p>
      </>
    )
  }

  if (done) {
    return (
      <>
        <PageHeading title="Exam result" lede={`${examSet} · ${correct} of 15.`} />
        <p className="mt-4 text-lg text-cream">Accuracy: {correct} of 15.</p>
        {saveNote ? <p className="mt-2 text-muted">{saveNote}</p> : null}
        {misses.length === 0 ? (
          <p className="mt-6 text-lg text-cream">Every question matched a listed answer.</p>
        ) : (
          <ul className="mt-6 grid gap-3">
            {misses.map((miss) => (
              <li key={`${miss.wordId}-${miss.kind}`} className="rounded-2xl border border-line bg-card px-5 py-4">
                <p className="text-lg text-cream">{miss.prompt}</p>
                <p className="mt-2 text-muted">{miss.explanation}</p>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className={`${actionClass} mt-6`} onClick={() => setQuestions(null)}>
          Back to exams
        </button>
      </>
    )
  }

  if (question) {
    return (
      <section className="mx-auto max-w-md">
        <p className="text-sm font-semibold text-copper">
          {examSet} · {index + 1} of 15
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-cream">{question.prompt}</h1>
        {question.detail ? <p className="mt-4 text-2xl text-cream">{question.detail}</p> : null}
        {question.choices ? (
          <div className="mt-6 grid gap-3">
            {question.choices.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={choice === option}
                disabled={checked !== null}
                className={`min-h-12 rounded-xl border px-4 py-3 text-left text-lg ${choice === option ? "border-copper bg-raised text-cream" : "border-line bg-card text-cream"}`}
                onClick={() => setChoice(option)}
              >
                {option}
              </button>
            ))}
          </div>
        ) : checked === null ? (
          <ExamAnswerForm value={typed} onChange={setTyped} onCheck={() => setChecked(gradeAnswer(typed, question.accepted))} />
        ) : (
          <input
            className={answerClass}
            aria-label="Your answer"
            value={typed}
            readOnly
            autoFocus
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              advance(checked)
            }}
          />
        )}
        {question.choices && checked === null ? (
          <button
            type="button"
            className={`${actionClass} mt-6`}
            disabled={!given.trim()}
            onClick={() => setChecked(gradeAnswer(given, question.accepted))}
          >
            Check
          </button>
        ) : checked === null ? null : (
          <div className="card-reveal mt-6 rounded-2xl border border-line bg-card px-5 py-4">
            <p className={checked ? "text-lg font-semibold text-cream" : "text-lg font-semibold text-danger"}>
              {checked ? "That's a listed answer." : "That is not a listed answer."}
            </p>
            <p className="mt-2 text-muted">{question.explanation}</p>
            <button type="button" className={`${actionClass} mt-4`} onClick={() => advance(checked)}>
              Continue
            </button>
          </div>
        )}
      </section>
    )
  }

  const sets: ExamSet[] = ["A1", "A2", "mixed"]
  return (
    <>
      <PageHeading title="Exams" lede="Fifteen questions from the word bank. A retake keeps the earlier attempt." />
      <ul className="mt-8 grid gap-3">
        {sets.map((set) => {
          const available = set === "mixed" ? words.length >= 15 : words.filter((word) => word.level === set).length >= 15
          const recommended = set === level
          return (
            <li key={set} className="rounded-2xl border border-line bg-card px-5 py-4">
              <p className="text-lg font-semibold text-cream">
                {set === "mixed" ? "Mixed" : set}
                {recommended ? " · Suggested start" : ""}
              </p>
              <p className="mt-1 text-muted">
                {available ? "15 questions. Translation, choice, blanks, articles, and verbs." : "This set needs 15 words at that level. They are not in the bank yet."}
              </p>
              <button type="button" className={`${actionClass} mt-4`} disabled={!available} onClick={() => start(set)}>
                Start
              </button>
            </li>
          )
        })}
      </ul>
      <h2 className="mt-10 text-xl font-semibold text-cream">Recent attempts</h2>
      {attempts.length === 0 ? (
        <p className="mt-3 text-lg text-muted">No exam has been taken.</p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {attempts.map((attempt) => (
            <li key={attempt.id} className="rounded-2xl border border-line bg-card px-5 py-4 text-cream">
              {attempt.examSet}: {attempt.correct} of {attempt.total}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
