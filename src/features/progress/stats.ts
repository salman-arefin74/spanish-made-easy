import { isKnown, shiftDate } from "../../algorithms/spaced-repetition/schedule.ts"
import { slotsRemaining } from "../vocabulary/session.ts"

const REVIEW_GRADES = new Set(["again", "hard", "good", "easy"])

export type BoardWord = { id: string; level: "A1" | "A2" }

export type BoardProgress = {
  wordId: string
  introducedOn: string
  lastResponse: string
  lastReviewedOn: string
  nextReviewOn: string
  intervalDays: number
}

export type BoardTopic = { id: string; title: string; sortOrder: number; finished: boolean }

export type BoardExam = {
  id: string
  examSet: string
  correct: number
  total: number
  createdAt: string
}

export type BoardAction = { href: string; label: string }

export type BoardFigures = {
  a1Known: number
  a1Total: number
  a2Known: number
  a2Total: number
  introduced: number
  situationsFinished: number
  situationsTotal: number
  target: number
  reviewsToday: number
  introducedToday: number
  slotsLeft: number
  due: number
  retention: { known: number; introduced: number } | null
  nextReview: string
  streak: number | null
  grammarFinished: number
  grammarTotal: number
  nextTopic: { id: string; title: string } | null
  exams: BoardExam[]
  action: BoardAction
}

export function streakLength(days: readonly string[], today: string): number {
  const unique = [...new Set(days)].sort()
  const latest = unique[unique.length - 1]
  if (!latest) return 0
  const yesterday = shiftDate(today, -1)
  if (latest !== today && latest !== yesterday) return 0
  let count = 1
  let cursor = latest
  const present = new Set(unique)
  while (present.has(shiftDate(cursor, -1))) {
    count += 1
    cursor = shiftDate(cursor, -1)
  }
  return count
}

export function buildBoard(input: {
  words: readonly BoardWord[]
  progress: readonly BoardProgress[]
  studyDays: readonly string[]
  topics: readonly BoardTopic[]
  exams: readonly BoardExam[]
  today: string
  dailyTarget: number
}): BoardFigures {
  const levelById = new Map(input.words.map((word) => [word.id, word.level]))
  const knownRows = input.progress.filter((row) => isKnown(row.intervalDays, row.lastResponse))
  const knownIds = new Set(knownRows.map((row) => row.wordId))
  const a1Total = input.words.filter((word) => word.level === "A1").length
  const a2Total = input.words.filter((word) => word.level === "A2").length
  const a1Known = [...knownIds].filter((id) => levelById.get(id) === "A1").length
  const a2Known = [...knownIds].filter((id) => levelById.get(id) === "A2").length
  const introduced = input.progress.length
  const introducedToday = input.progress.filter((row) => row.introducedOn === input.today).length
  const reviewsToday = input.progress.filter(
    (row) => row.lastReviewedOn === input.today && REVIEW_GRADES.has(row.lastResponse),
  ).length
  const dueRows = input.progress.filter((row) => row.nextReviewOn <= input.today)
  const future = input.progress
    .map((row) => row.nextReviewOn)
    .filter((day) => day > input.today)
    .sort()
  const orderedTopics = [...input.topics].sort((left, right) => left.sortOrder - right.sortOrder)
  const nextTopic = orderedTopics.find((topic) => !topic.finished) ?? null
  const streak = streakLength(input.studyDays, input.today)
  const slotsLeft = slotsRemaining(input.dailyTarget, introducedToday)
  const action = recommend(dueRows.length, slotsLeft, introduced, nextTopic)

  return {
    a1Known,
    a1Total,
    a2Known,
    a2Total,
    introduced,
    situationsFinished: 0,
    situationsTotal: 12,
    target: input.dailyTarget,
    reviewsToday,
    introducedToday,
    slotsLeft,
    due: dueRows.length,
    retention: introduced === 0 ? null : { known: knownRows.length, introduced },
    nextReview: dueRows.length > 0 ? "Due now" : (future[0] ?? "No review is scheduled."),
    streak: streak >= 2 ? streak : null,
    grammarFinished: orderedTopics.filter((topic) => topic.finished).length,
    grammarTotal: orderedTopics.length,
    nextTopic: nextTopic ? { id: nextTopic.id, title: nextTopic.title } : null,
    exams: [...input.exams],
    action,
  }
}

function recommend(
  due: number,
  slotsLeft: number,
  introduced: number,
  nextTopic: BoardTopic | null,
): BoardAction {
  if (due > 0) return { href: "/revision", label: due === 1 ? "Review 1 due word" : `Review ${due} due words` }
  if (slotsLeft > 0 && introduced === 0) return { href: "/vocabulary/today", label: "Learn your first words" }
  if (slotsLeft > 0) return { href: "/vocabulary/today", label: "Learn today's words" }
  if (nextTopic) return { href: `/sentence-builder/${nextTopic.id}`, label: `Study ${nextTopic.title}` }
  return { href: "/revision", label: "Nothing is due" }
}
