import { useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router"
import { EmptyState } from "../../components/ui/EmptyState.tsx"
import { PageHeading } from "../../components/ui/PageHeading.tsx"
import { getSupabase } from "../../lib/supabase/client.ts"
import { useAuth } from "../auth/RequireAuth.tsx"
import { localDateISO } from "../vocabulary/session.ts"
import { buildBoard, type BoardExam, type BoardFigures, type BoardProgress, type BoardTopic, type BoardWord } from "./stats.ts"

function Bar({ label, value, total }: { label: string; value: number; total: number }) {
  const width = total === 0 ? 0 : Math.min(100, Math.round((value / total) * 100))
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-cream">{label}</span>
        <span className="text-cream">{value} of {total}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-raised" aria-hidden="true">
        <div className="h-full rounded-full bg-copper" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card px-5 py-4">
      <h2 className="text-lg font-semibold text-cream">{title}</h2>
      {children}
    </section>
  )
}

export function ProgressView({ figures }: { figures: BoardFigures }) {
  return (
    <>
      <PageHeading title="Progress" lede="Your words, reviews, and exams." />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Block title="Today">
          <p className="mt-3 text-cream">Daily vocabulary target: {figures.target}</p>
          <p className="mt-1 text-cream">Reviews finished today: {figures.reviewsToday}</p>
          <p className="mt-1 text-cream">New words today: {figures.introducedToday}</p>
          <p className="mt-1 text-cream">Vocabulary slots left: {figures.slotsLeft}</p>
          {figures.streak ? <p className="mt-3 text-cream">{figures.streak} day streak</p> : null}
          <Link className="mt-4 inline-flex min-h-12 items-center text-lg font-semibold text-copper" to={figures.action.href}>
            {figures.action.label}
          </Link>
        </Block>
        <Block title="Course">
          <Bar label="A1 known" value={figures.a1Known} total={figures.a1Total} />
          <Bar label="A2 known" value={figures.a2Known} total={figures.a2Total} />
          <p className="mt-3 text-sm text-muted">
            A word is known when you remember it and will not see it again for a week. The first time you tap "I know this," it comes back tomorrow.
          </p>
          <p className="mt-4 text-cream">Introduced: {figures.introduced}</p>
          <Bar label="Situations finished" value={figures.situationsFinished} total={figures.situationsTotal} />
          {figures.situationsTotal === 0 ? (
            <p className="mt-2 text-sm text-muted">Situations are not loaded yet.</p>
          ) : null}
        </Block>
        <Block title="Memory">
          <p className="mt-3 text-cream">Due now: {figures.due}</p>
          <p className="mt-1 text-cream">
            {figures.retention
              ? `Retention: ${figures.retention.known} of ${figures.retention.introduced} introduced words are known.`
              : "Retention appears after the first word is introduced."}
          </p>
          <p className="mt-1 text-cream">Next review: {figures.nextReview}</p>
        </Block>
        <Block title="Grammar">
          {figures.grammarTotal === 0 ? (
            <p className="mt-3 text-cream">Grammar lessons are not loaded yet.</p>
          ) : (
            <>
              <Bar label="Topics finished" value={figures.grammarFinished} total={figures.grammarTotal} />
              {figures.nextTopic ? (
                <Link className="mt-4 inline-flex text-copper" to={`/sentence-builder/${figures.nextTopic.id}`}>
                  Next topic: {figures.nextTopic.title}
                </Link>
              ) : (
                <p className="mt-4 text-cream">Every loaded topic is finished.</p>
              )}
            </>
          )}
        </Block>
        <section className="rounded-2xl border border-line bg-card px-5 py-4 md:col-span-2">
          <h2 className="text-lg font-semibold text-cream">Recent exams</h2>
          {figures.exams.length === 0 ? (
            <p className="mt-3 text-cream">No exam has been taken.</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {figures.exams.map((exam) => (
                <li key={exam.id} className="text-cream">
                  {exam.examSet}: {exam.correct} of {exam.total}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

export function ProgressBoard() {
  const auth = useAuth()
  const [state, setState] = useState<{ status: "loading" | "unconfigured" | "error" | "ready"; message: string; figures: BoardFigures | null }>({
    status: "loading",
    message: "",
    figures: null,
  })

  useEffect(() => {
    const userId = auth.userId
    if (!userId) return
    const supabase = getSupabase()
    if (!supabase) return
    let active = true
    void Promise.all([
      supabase.from("words").select("id, level"),
      supabase.from("user_word_progress").select("word_id, introduced_on, last_response, last_reviewed_on, next_review_on, interval_days").eq("user_id", userId),
      supabase.from("user_study_days").select("studied_on").eq("user_id", userId),
      supabase.from("grammar_topics").select("id, title, sort_order"),
      supabase.from("user_grammar_progress").select("topic_id, finished").eq("user_id", userId),
      supabase.from("quiz_attempts").select("id, exam_set, correct_count, total_count, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      supabase.from("situations").select("id"),
      supabase.from("user_situation_progress").select("situation_id, finished").eq("user_id", userId),
    ]).then(([words, progress, days, topics, grammar, exams, situations, situationProgress]) => {
      if (!active) return
      const today = localDateISO(new Date())
      if (words.error || progress.error) {
        const failure = words.error ?? progress.error
        setState({ status: "error", message: failure?.message ?? "The progress board could not be loaded.", figures: null })
        return
      }
      const finished = new Set((grammar.error ? [] : (grammar.data ?? [])).filter((row) => row.finished).map((row) => row.topic_id))
      const topicRows: BoardTopic[] = topics.error
        ? []
        : (topics.data ?? []).map((topic) => ({
            id: topic.id,
            title: topic.title,
            sortOrder: topic.sort_order,
            finished: finished.has(topic.id),
          }))
      const examRows: BoardExam[] = exams.error
        ? []
        : (exams.data ?? []).map((row) => ({
            id: row.id,
            examSet: row.exam_set,
            correct: row.correct_count,
            total: row.total_count,
            createdAt: row.created_at,
          }))
      const wordRows: BoardWord[] = (words.data ?? [])
        .filter((word) => word.level === "A1" || word.level === "A2")
        .map((word) => ({ id: word.id, level: word.level }))
      const progressRows: BoardProgress[] = (progress.data ?? []).map((row) => ({
        wordId: row.word_id,
        introducedOn: row.introduced_on,
        lastResponse: row.last_response,
        lastReviewedOn: row.last_reviewed_on,
        nextReviewOn: row.next_review_on,
        intervalDays: row.interval_days,
      }))
      const figures = buildBoard({
        words: wordRows,
        progress: progressRows,
        studyDays: days.error ? [] : (days.data ?? []).map((row) => row.studied_on),
        topics: topicRows,
        exams: examRows,
        situations: situations.error
          ? []
          : (situations.data ?? []).map((situation) => ({
              finished: situationProgress.error
                ? false
                : (situationProgress.data ?? []).some((row) => row.situation_id === situation.id && row.finished),
            })),
        today,
        dailyTarget: auth.profile?.daily_learning_target ?? 10,
      })
      setState({ status: "ready", message: "", figures })
    })
    return () => {
      active = false
    }
  }, [auth.userId, auth.profile?.daily_learning_target])

  if (!getSupabase()) {
    return (
      <>
        <PageHeading title="Progress" lede="Your words, reviews, and exams." />
        <EmptyState>Progress is not connected. Add the Supabase keys and sign in. This page does not show sample scores.</EmptyState>
      </>
    )
  }
  if (state.status === "loading") return <p className="text-lg text-muted">Loading progress…</p>
  if (state.status === "error" || !state.figures) {
    return (
      <>
        <PageHeading title="Progress" lede="Your words, reviews, and exams." />
        <p className="mt-6 text-lg text-danger" role="alert">{state.message}</p>
      </>
    )
  }
  return <ProgressView figures={state.figures} />
}
