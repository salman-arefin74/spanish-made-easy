import type { ContentLevel } from "../../content/validate.ts"

export type CardAnswer = "know" | "still_learning"

export type SessionCard = {
  id: string
  requeued: boolean
}

export type FinishedCard = {
  id: string
  answer: CardAnswer
}

export type SessionState = {
  queue: SessionCard[]
  finished: FinishedCard[]
  total: number
}

export function localDateISO(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

export function nextLocalDateISO(now: Date): string {
  return localDateISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
}

export function slotsRemaining(target: number, introducedToday: number): number {
  return Math.max(0, target - introducedToday)
}

export function startSession(wordIds: string[]): SessionState {
  return {
    queue: wordIds.map((id) => ({ id, requeued: false })),
    finished: [],
    total: wordIds.length,
  }
}

export function answerCard(state: SessionState, answer: CardAnswer): SessionState {
  const [current, ...rest] = state.queue
  if (!current) return state
  if (answer === "still_learning" && !current.requeued) {
    return {
      ...state,
      queue: [...rest, { id: current.id, requeued: true }],
    }
  }
  return {
    ...state,
    queue: rest,
    finished: [...state.finished, { id: current.id, answer }],
  }
}

export function sessionPosition(state: SessionState): string {
  return `${state.finished.length} of ${state.total}`
}

export function orderForToday<T extends { level: ContentLevel }>(
  words: T[],
  startingLevel: ContentLevel,
): T[] {
  if (startingLevel === "A1") return words
  return [...words.filter((word) => word.level === "A2"), ...words.filter((word) => word.level === "A1")]
}

export function selectNewWords<T extends { id: string }>(
  words: T[],
  introducedIds: ReadonlySet<string>,
  limit: number,
): T[] {
  if (limit <= 0) return []
  return words.filter((word) => !introducedIds.has(word.id)).slice(0, limit)
}
